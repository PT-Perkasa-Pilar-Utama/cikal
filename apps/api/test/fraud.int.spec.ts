import { applicationFraudResponseSchema, errorEnvelopeSchema, type StepCode } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { ipReputationSimulationAddresses } from "../src/modules/addons/m08-fraud/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { Licensing, seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantEncryption } from "../src/platform/crypto/tenant-encryption.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { personalBody, sectionClient } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { installTestLicense, issueTestLicense, POC_LICENSE_MODULES } from "./support/license.js";
import {
  applicationState,
  drainProcessJobs,
  insertRoute,
  latestSteps,
  registerStepHandlers,
  startProcess,
} from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const ROUTE: Partial<Record<StepCode, boolean>> = { DATA_ENTRY: true, FRAUD: true, APPROVAL: true };
const MANUAL_REVIEW = "Manual review is not available in POC";
/** Alamat KTP uji ada di provinsi 32; IP simulasi `otherProvince` juga di provinsi 32, jadi lokasinya cocok. */
const SAME_PROVINCE_IP = ipReputationSimulationAddresses.otherProvince;
/** IP simulasi lain berlokasi di DKI Jakarta (31), berbeda dari provinsi KTP (TRM_FRD_005). */
const OTHER_PROVINCE_IP = "198.51.100.7";

let counter = 0;
/** NIK dan nama unik per pemohon agar frekuensi satu uji tidak ikut uji lain. */
const nextIdentity = () => {
  counter += 1;
  const suffix = String(counter).padStart(4, "0");
  return {
    idCardNumber: `327301150390${suffix}`,
    fullName: `Fraud Case ${suffix}`,
    fullNameId: `FRAUD CASE ${suffix}`,
  };
};

/** Langkah FRAUD M08 dengan Fraud Matrix, FraudVelocityRule seed, dan adapter IP simulasi (api-specs 21, US-65). */
describe("fraud", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let client: ReturnType<typeof sectionClient>;

  /** Pengajuan yang sudah disubmit dengan IP asal `ip` (`null` seperti Upload Excel). */
  const applicant = async (identity: object, ip: string | null) => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: ROUTE }]);
    const id = await client.createDraft(sales, productId);
    await client.save(sales, id, "personal", personalBody(identity));
    await db.owner.query(
      `update application.applications set status = 'ON_PROGRESS', submitted_at = now(), submitted_by = created_by,
              client_ip_address = $2 where id = $1`,
      [id, ip],
    );
    return id;
  };
  const checked = async (identity: object, ip: string | null) => {
    const id = await applicant(identity, ip);
    const processId = await startProcess(app, id);
    await drainProcessJobs(app, db.owner);
    return { id, processId, fraud: (await latestSteps(db.owner, processId)).get("FRAUD") };
  };
  const fraudOf = (applicationId: string, query = "") =>
    app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/fraud${query}`,
      headers: inquirer.headers,
    });
  const resultOf = async (applicationId: string) => {
    const res = await fraudOf(applicationId);
    expect(res.statusCode, res.body).toBe(200);
    return applicationFraudResponseSchema.parse(res.json()).data;
  };
  const blacklistRows = async (applicationId: string) =>
    (
      await db.owner.query<{ reason: string }>(
        "select reason from m08_fraud.blacklists where source_application_id = $1",
        [applicationId],
      )
    ).rows;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerStepHandlers(app, ["APPROVAL"]);
    const role = await createRole(db.owner, "Sales Fraud", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    inquirer = await createSession(db.owner, { roleId: seedRoleIds.riskManager });
    client = sectionClient(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("captures the request IP when a web draft is created", async () => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: ROUTE }]);
    const id = await client.createDraft(sales, productId);

    const { rows } = await db.owner.query<{ ip: string }>(
      "select host(client_ip_address) as ip from application.applications where id = $1",
      [id],
    );
    expect(rows[0]?.ip).toBe("127.0.0.1");
  });

  it("AC-65.01 TRM_FRD_001 finishes a blacklisted applicant as High Fraud Potential", async () => {
    const identity = nextIdentity();
    const nikBlindIndex = await app
      .get(TenantTx)
      .withTenantTx({ tenantId: seedCompanyIds.company001, userId: sales.userId }, (tx) =>
        app.get(TenantEncryption).blindIndex(tx, identity.idCardNumber),
      );
    await db.owner.query(
      `insert into m08_fraud.blacklists (id, tenant_id, id_card_number_bidx, reason) values ($1, $2, $3, 'Known fraud')`,
      [uuidv7(), seedCompanyIds.company001, nikBlindIndex],
    );

    const { id, fraud } = await checked(identity, SAME_PROVINCE_IP);

    expect(fraud).toMatchObject({ status: "COMPLETED", outcome_code: "HIGH_FRAUD_POTENTIAL" });
    expect(await applicationState(db.owner, id)).toMatchObject({ status: "FINISHED_REJECTED" });
    expect(await resultOf(id)).toMatchObject({ outcome: "HIGH_FRAUD_POTENTIAL", isBlacklisted: true, matrixRow: null });
  });

  it("AC-65.01 TRM_FRD_002 finishes the fourth application of the same name in a day and blacklists the applicant", async () => {
    const identity = nextIdentity();
    for (let index = 0; index < 3; index += 1) {
      await applicant({ ...identity, idCardNumber: nextIdentity().idCardNumber }, SAME_PROVINCE_IP);
    }

    const { id, fraud } = await checked(identity, SAME_PROVINCE_IP);

    expect(fraud).toMatchObject({ status: "COMPLETED", outcome_code: "HIGH_FRAUD_POTENTIAL" });
    expect(await applicationState(db.owner, id)).toMatchObject({ status: "FINISHED_REJECTED" });
    expect(await resultOf(id)).toMatchObject({
      outcome: "HIGH_FRAUD_POTENTIAL",
      isBlacklisted: false,
      velocityHits: [
        { dimension: "FULL_NAME", windowValue: 1, windowUnit: "DAY", maxCount: 3, actualCount: 4, exceeded: true },
      ],
    });
    expect(await blacklistRows(id)).toEqual([{ reason: "Velocity rule exceeded: FULL_NAME 4 in 1 DAY" }]);
  });

  it("AC-65.01 TRM_FRD_003 is Clean for the third application of the same name in a day", async () => {
    const identity = nextIdentity();
    for (let index = 0; index < 2; index += 1) {
      await applicant({ ...identity, idCardNumber: nextIdentity().idCardNumber }, SAME_PROVINCE_IP);
    }

    const { id, fraud } = await checked(identity, SAME_PROVINCE_IP);

    expect(fraud).toMatchObject({ status: "COMPLETED", outcome_code: "CLEAN" });
    expect(await resultOf(id)).toMatchObject({
      outcome: "CLEAN",
      velocityHits: [{ actualCount: 3, exceeded: false }],
    });
    expect(await blacklistRows(id)).toEqual([]);
  });

  it("AC-65.01 TRM_FRD_004 stops a VPN or proxy IP at Error because manual review is not in the POC", async () => {
    const { id, fraud } = await checked(nextIdentity(), ipReputationSimulationAddresses.vpnOrProxy);

    expect(fraud).toMatchObject({ status: "ERROR", error_category: "BUSINESS_SETUP", error_message: MANUAL_REVIEW });
    expect(await resultOf(id)).toMatchObject({
      outcome: "SUSPICIOUS",
      ipCheck: { status: "VPN_PROXY", category: "VPN_PROXY", providerCode: "SIMULATION_M08" },
      matrixRow: { priority: 1, nameCondition: "NORMAL", ipCondition: "VPN_PROXY" },
    });
  });

  it("AC-65.01 TRM_FRD_005 stops an IP outside the ID card province at Error", async () => {
    const { id, fraud } = await checked(nextIdentity(), OTHER_PROVINCE_IP);

    expect(fraud).toMatchObject({ status: "ERROR", error_message: MANUAL_REVIEW });
    expect(await resultOf(id)).toMatchObject({
      outcome: "SUSPICIOUS",
      ipCheck: { status: "LOCATION_MISMATCH", ipAddress: OTHER_PROVINCE_IP },
      matrixRow: { priority: 2 },
    });
  });

  it("AC-65.01 TRM_FRD_006 is Clean for a normal IP and one application", async () => {
    const { id, fraud } = await checked(nextIdentity(), SAME_PROVINCE_IP);

    expect(fraud).toMatchObject({ status: "COMPLETED", outcome_code: "CLEAN" });
    expect(await resultOf(id)).toEqual({
      outcome: "CLEAN",
      isBlacklisted: false,
      ipCheck: { status: "NORMAL", ipAddress: SAME_PROVINCE_IP, category: "NORMAL", providerCode: "SIMULATION_M08" },
      velocityHits: [
        { dimension: "FULL_NAME", windowValue: 1, windowUnit: "DAY", maxCount: 3, actualCount: 1, exceeded: false },
      ],
      matrixRow: { id: expect.any(String), priority: 3, nameCondition: "NORMAL", ipCondition: "NORMAL" },
      review: null,
    });
  });

  it("AC-65.02 shows the IP check as Not applicable for an application without an IP", async () => {
    const { id, fraud } = await checked(nextIdentity(), null);

    expect(fraud).toMatchObject({ status: "COMPLETED", outcome_code: "CLEAN" });
    expect(await resultOf(id)).toMatchObject({
      outcome: "CLEAN",
      ipCheck: { status: "NOT_APPLICABLE", ipAddress: null, category: null, providerCode: null },
      matrixRow: { priority: 4, ipCondition: "ANY" },
    });
    const { rows } = await db.owner.query(
      "select id from integration.integration_call_logs where application_id = $1 and module_code = 'M08'",
      [id],
    );
    expect(rows).toEqual([]);
  });

  it("answers NOT_FOUND for a process of another application", async () => {
    const { processId } = await checked(nextIdentity(), null);
    const other = await checked(nextIdentity(), null);

    const res = await fraudOf(other.id, `?processInstanceId=${processId}`);

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });

  it("answers APPLICATION_NOT_FOUND for an unknown application", async () => {
    const res = await fraudOf("0192b6ad-9999-7000-8000-000000000001");

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      message: "Application not found",
    });
  });

  it("answers MODULE_NOT_LICENSED when the company has no M08 licence", async () => {
    const { id } = await checked(nextIdentity(), null);
    await installTestLicense(db.owner, issueTestLicense({ modules: POC_LICENSE_MODULES.filter((m) => m !== "M08") }));
    app.get(Licensing).invalidate();
    try {
      const res = await fraudOf(id);

      expect(res.statusCode).toBe(403);
      expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
        code: "MODULE_NOT_LICENSED",
        message: "You do not have access to this page",
      });
    } finally {
      await installTestLicense(db.owner, issueTestLicense());
      app.get(Licensing).invalidate();
    }
  });
});
