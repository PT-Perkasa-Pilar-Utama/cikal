import { applicationCreditBureauResponseSchema, errorEnvelopeSchema, type StepCode } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { creditBureauSimulationNiks } from "../src/modules/addons/m10-credit-bureau/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { Licensing } from "../src/modules/core/tenancy/index.js";
import { personalBody, sectionClient } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { installTestLicense, issueTestLicense, POC_LICENSE_MODULES } from "./support/license.js";
import { drainProcessJobs, insertRoute, latestSteps, registerStepHandlers, startProcess } from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const ROUTE: Partial<Record<StepCode, boolean>> = { DATA_ENTRY: true, CREDIT_BUREAU: true, APPROVAL: true };
const GOOD_NIK = "3171990000000201";

/** Langkah CREDIT_BUREAU M10 dengan adapter simulasi SYNC dan CreditBureauOutcomeMapping seed (api-specs 23, US-68). */
describe("credit bureau", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let client: ReturnType<typeof sectionClient>;

  const checked = async (nik: string) => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: ROUTE }]);
    const id = await client.createDraft(sales, productId);
    await client.save(sales, id, "personal", personalBody({ idCardNumber: nik }));
    await db.owner.query(
      `update application.applications set status = 'ON_PROGRESS', submitted_at = now(), submitted_by = created_by
        where id = $1`,
      [id],
    );
    const processId = await startProcess(app, id);
    await drainProcessJobs(app, db.owner);
    return { id, processId, slik: (await latestSteps(db.owner, processId)).get("CREDIT_BUREAU") };
  };
  const creditBureauOf = (applicationId: string, query = "") =>
    app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/credit-bureau${query}`,
      headers: inquirer.headers,
    });
  const resultOf = async (applicationId: string) => {
    const res = await creditBureauOf(applicationId);
    expect(res.statusCode, res.body).toBe(200);
    return applicationCreditBureauResponseSchema.parse(res.json()).data;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerStepHandlers(app, ["APPROVAL"]);
    const role = await createRole(db.owner, "Sales SLIK", [
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

  it("AC-68.01 shows Collectibility 1 - Good for a collectibility 1 report", async () => {
    const { id, slik } = await checked(GOOD_NIK);

    expect(slik).toMatchObject({ status: "COMPLETED", outcome_code: "COLLECT_1" });
    expect(await resultOf(id)).toEqual({
      mode: "SYNC",
      providerCode: "SIMULATION_M10",
      reportReference: `SIM-${GOOD_NIK}`,
      reportDate: expect.any(String),
      hasHistory: true,
      aggregatedCollectibility: 1,
      quality: "Good",
      outcome: "COLLECT_1",
      label: "Collectibility 1 - Good",
      reportFileId: null,
      facilities: [
        {
          lenderName: "Bank Simulasi",
          facilityType: "KREDIT_KONSUMSI",
          plafond: "50000000.00",
          outstanding: "25000000.00",
          collectibility: 1,
          daysPastDue: 0,
          condition: "ACTIVE",
          lastUpdated: null,
        },
      ],
    });
  });

  it.each([
    ["TRM_SLK_002", creditBureauSimulationNiks.collectibility2, "COLLECT_2", "Collectibility 2 - Fair"],
    ["TRM_SLK_003", creditBureauSimulationNiks.collectibility3, "COLLECT_3", "Collectibility 3 - Poor"],
    ["TRM_SLK_004", creditBureauSimulationNiks.collectibility5, "COLLECT_5", "Collectibility 5 - Poor"],
    ["TRM_SLK_005", creditBureauSimulationNiks.noHistory, "NO_HISTORY", "No credit history"],
    ["TRM_SLK_007", creditBureauSimulationNiks.severalFacilities, "COLLECT_3", "Collectibility 3 - Poor"],
  ])("AC-68.02 %s shows the matrix label", async (_row, nik, outcome, label) => {
    const { id, slik } = await checked(nik);

    expect(slik).toMatchObject({ status: "COMPLETED", outcome_code: outcome });
    expect(await resultOf(id)).toMatchObject({ outcome, label });
  });

  it("AC-68.02 TRM_SLK_006 stops SLIK at Error for a collectibility outside 1 to 5", async () => {
    const { id, slik } = await checked(creditBureauSimulationNiks.collectibilityOutOfRange);

    expect(slik).toMatchObject({
      status: "ERROR",
      error_category: "INVALID_RESPONSE",
      error_message: "Invalid collectibility value: 6",
    });
    expect(await creditBureauOf(id).then((res) => res.json())).toEqual({ data: null, meta: { stepStatus: "ERROR" } });
  });

  it("stops SLIK at Error when the company uses the manual iDeb mode", async () => {
    await db.owner.query("update integration.integration_configs set mode = 'MANUAL' where module_code = 'M10'");
    try {
      const { slik } = await checked(GOOD_NIK);

      expect(slik).toMatchObject({
        status: "ERROR",
        error_category: "BUSINESS_SETUP",
        error_message: "Credit bureau mode MANUAL is not available in POC",
      });
    } finally {
      await db.owner.query("update integration.integration_configs set mode = 'SYNC' where module_code = 'M10'");
    }
  });

  it("answers NOT_FOUND for a process of another application", async () => {
    const { processId } = await checked(GOOD_NIK);
    const other = await checked(GOOD_NIK);

    const res = await creditBureauOf(other.id, `?processInstanceId=${processId}`);

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });

  it("answers APPLICATION_NOT_FOUND for an unknown application", async () => {
    const res = await creditBureauOf("0192b6ad-9999-7000-8000-000000000001");

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      message: "Application not found",
    });
  });

  it("answers MODULE_NOT_LICENSED when the company has no M10 licence", async () => {
    const { id } = await checked(GOOD_NIK);
    await installTestLicense(db.owner, issueTestLicense({ modules: POC_LICENSE_MODULES.filter((m) => m !== "M10") }));
    app.get(Licensing).invalidate();
    try {
      const res = await creditBureauOf(id);

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
