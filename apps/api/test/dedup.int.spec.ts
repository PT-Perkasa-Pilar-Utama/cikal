import {
  type ApplicationStatus,
  applicationDedupResponseSchema,
  errorEnvelopeSchema,
  processMonitoringResponseSchema,
  type StepCode,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { Licensing } from "../src/modules/core/tenancy/index.js";
import { birthDateForAge, personalBody, sectionClient } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { installTestLicense, issueTestLicense, POC_LICENSE_MODULES } from "./support/license.js";
import { drainProcessJobs, insertRoute, latestSteps, registerStepHandlers, startProcess } from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const ROUTE: Partial<Record<StepCode, boolean>> = { DATA_ENTRY: true, DEDUP: true, DUKCAPIL: true, APPROVAL: true };
const MANUAL_REVIEW = "Manual review is not available in POC";

let nikCounter = 0;
/** NIK unik per pemohon uji agar kandidat satu uji tidak ikut uji lain. */
const nextNik = () => {
  nikCounter += 1;
  return `327301140290${String(nikCounter).padStart(4, "0")}`;
};

/** Langkah DEDUP M06 dengan Dedup Matrix seed (api-specs 19, US-59). */
describe("dedup", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let admin: TestSession;
  let client: ReturnType<typeof sectionClient>;

  /** Pengajuan dengan section Personal tersimpan lewat API, lalu status diatur seperti sudah disubmit. */
  const applicant = async (
    personal: object,
    status: ApplicationStatus = "DISBURSED",
    route: Partial<Record<StepCode, boolean>> = ROUTE,
  ) => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: route }]);
    const id = await client.createDraft(sales, productId);
    await client.save(sales, id, "personal", personalBody(personal));
    await db.owner.query(
      "update application.applications set status = $2, submitted_at = now(), submitted_by = created_by where id = $1",
      [id, status],
    );
    const { rows } = await db.owner.query<{ loan_id: string }>(
      "select loan_id from application.applications where id = $1",
      [id],
    );
    return { id, loanId: rows[0]?.loan_id ?? "" };
  };
  /** Pemohon baru yang prosesnya dijalankan sampai antrean job kosong. */
  const checked = async (personal: object, route?: Partial<Record<StepCode, boolean>>) => {
    const subject = await applicant(personal, "ON_PROGRESS", route);
    const processId = await startProcess(app, subject.id);
    await drainProcessJobs(app, db.owner);
    return { ...subject, processId, steps: await latestSteps(db.owner, processId) };
  };
  const dedupOf = (applicationId: string, query = "") =>
    app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/dedup${query}`,
      headers: inquirer.headers,
    });
  const dedupBody = async (applicationId: string) => {
    const res = await dedupOf(applicationId);
    expect(res.statusCode, res.body).toBe(200);
    return applicationDedupResponseSchema.parse(res.json());
  };
  const identity = (age: number, fields: object = {}) => ({
    idCardNumber: nextNik(),
    fullName: "Rudi Hartono",
    fullNameId: "RUDI HARTONO",
    placeOfBirth: "Bandung",
    dateOfBirth: birthDateForAge(age),
    motherMaidenName: "Siti Aminah",
    ...fields,
  });

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerStepHandlers(app, ["DUKCAPIL", "APPROVAL"]);
    const role = await createRole(db.owner, "Sales Dedup", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    inquirer = await createSession(db.owner, { roleId: seedRoleIds.riskManager });
    admin = await createSession(db.owner, { roleId: seedRoleIds.adminOperasional });
    client = sectionClient(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-59.01 TRM_DDP_001 matches a known applicant and skips Dukcapil", async () => {
    const person = identity(30);
    const known = await applicant(person);

    const { id, steps } = await checked(person);

    expect(steps.get("DEDUP")).toMatchObject({ status: "COMPLETED", outcome_code: "MATCH" });
    expect(steps.get("DUKCAPIL")).toMatchObject({ status: "SKIPPED", skip_reason: "DEDUP_MATCH" });
    expect((await dedupBody(id)).data).toEqual({
      outcome: "MATCH",
      ranAt: expect.any(String),
      matchedApplication: { id: known.id, loanId: known.loanId },
      matrixRow: {
        id: expect.any(String),
        priority: 1,
        nik: "MATCH",
        fullNameId: "MATCH",
        dob: "MATCH",
        pob: "MATCH",
        motherMaidenName: "MATCH",
      },
      candidates: [
        {
          loanId: known.loanId,
          status: "DISBURSED",
          nikResult: "MATCH",
          dobResult: "MATCH",
          pobResult: "MATCH",
          nameScore: "1.0000",
          motherNameScore: "1.0000",
        },
      ],
      review: null,
    });
  });

  it("AC-59.01 TRM_DDP_002 stops a fuzzy name match at Error because manual review is not in the POC", async () => {
    const person = identity(31);
    await applicant({
      ...person,
      fullName: "Rudy Hartono",
      fullNameId: "RUDY HARTONO",
      motherMaidenName: "Siti Amina",
    });

    const { id, steps } = await checked(person);

    expect(steps.get("DEDUP")).toMatchObject({
      status: "ERROR",
      error_category: "BUSINESS_SETUP",
      error_message: MANUAL_REVIEW,
    });
    expect((await dedupBody(id)).data).toMatchObject({
      outcome: "REVIEW",
      matrixRow: { priority: 2, fullNameId: "FUZZY", motherMaidenName: "FUZZY" },
      candidates: [{ nameScore: "0.9091", motherNameScore: "0.9000" }],
    });
  });

  it("AC-59.01 TRM_DDP_003 is UnMatch for a new applicant and continues to Dukcapil", async () => {
    const { id, steps } = await checked(identity(32, { fullName: "Budi Santoso", fullNameId: "BUDI SANTOSO" }));

    expect(steps.get("DEDUP")).toMatchObject({ status: "COMPLETED", outcome_code: "UNMATCH" });
    expect(steps.get("DUKCAPIL")).toMatchObject({ status: "COMPLETED" });
    expect((await dedupBody(id)).data).toMatchObject({
      outcome: "UNMATCH",
      matchedApplication: null,
      matrixRow: null,
      candidates: [],
    });
  });

  it("AC-59.01 TRM_DDP_004 stops the same NIK with a different identity at Error for review", async () => {
    const person = identity(33);
    await applicant({
      ...person,
      fullName: "Agus Salim",
      fullNameId: "AGUS SALIM",
      placeOfBirth: "Medan",
      dateOfBirth: birthDateForAge(45),
      motherMaidenName: "Ratna Sari",
    });

    const { id, steps } = await checked(person);

    expect(steps.get("DEDUP")).toMatchObject({ status: "ERROR", error_message: MANUAL_REVIEW });
    expect((await dedupBody(id)).data).toMatchObject({ outcome: "REVIEW", matrixRow: { priority: 3 } });
  });

  it("AC-59.01 TRM_DDP_006 records Skipped - not in route when the product route turns Dedup off", async () => {
    const { id, steps } = await checked(identity(34), { ...ROUTE, DEDUP: false });

    expect(steps.get("DEDUP")).toMatchObject({ status: "SKIPPED", skip_reason: "NOT_IN_ROUTE" });
    expect(await dedupBody(id)).toEqual({ data: null, meta: { stepStatus: "SKIPPED" } });
  });

  it("AC-59.01 TRM_DDP_007 stops the same NIK as an application still in progress at Error", async () => {
    const person = identity(35);
    const inFlight = await applicant(person, "ON_PROGRESS");

    const { id, steps } = await checked(person);

    expect(steps.get("DEDUP")).toMatchObject({ status: "ERROR", error_message: MANUAL_REVIEW });
    expect((await dedupBody(id)).data).toMatchObject({
      outcome: "DUPLICATE_IN_FLIGHT",
      matchedApplication: { id: inFlight.id, loanId: inFlight.loanId },
      matrixRow: null,
    });
  });

  it("answers the result of the requested process and Pending before the process starts", async () => {
    const { id, processId } = await checked(identity(36));
    const draft = await applicant(identity(37), "ON_PROGRESS");

    const res = await dedupOf(id, `?processInstanceId=${processId}`);

    expect(applicationDedupResponseSchema.parse(res.json()).data?.outcome).toBe("UNMATCH");
    expect(await dedupBody(draft.id)).toEqual({ data: null, meta: { stepStatus: "PENDING" } });
  });

  it("answers NOT_FOUND for a process of another application", async () => {
    const { processId } = await checked(identity(38));
    const other = await checked(identity(39));

    const res = await dedupOf(other.id, `?processInstanceId=${processId}`);

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });

  it("answers APPLICATION_NOT_FOUND for an unknown application", async () => {
    const res = await dedupOf("0192b6ad-9999-7000-8000-000000000001");

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      message: "Application not found",
    });
  });

  it("answers MODULE_NOT_LICENSED when the company has no M06 licence", async () => {
    const { id } = await checked(identity(40));
    await installTestLicense(db.owner, issueTestLicense({ modules: POC_LICENSE_MODULES.filter((m) => m !== "M06") }));
    app.get(Licensing).invalidate();
    try {
      const res = await dedupOf(id);

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

  it("AC-59.02 shows the Dedup step as Error with the module message in Process Monitoring", async () => {
    const { rows: settings } = await db.owner.query("select * from m06_dedup.dedup_field_settings");
    await db.owner.query("delete from m06_dedup.dedup_field_settings");
    try {
      const { loanId } = await checked(identity(41));

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/process-monitoring?q=${loanId}`,
        headers: admin.headers,
      });

      expect(res.statusCode, res.body).toBe(200);
      expect(processMonitoringResponseSchema.parse(res.json()).data[0]?.currentStep).toMatchObject({
        stepCode: "DEDUP",
        status: "ERROR",
        errorCategory: "BUSINESS_SETUP",
        errorMessage: "Dedup field settings are not configured",
      });
    } finally {
      for (const row of settings) {
        await db.owner.query(
          `insert into m06_dedup.dedup_field_settings (id, tenant_id, field_code, algorithm, fuzzy_threshold)
           values ($1, $2, $3, $4, $5)`,
          [row.id, row.tenant_id, row.field_code, row.algorithm, row.fuzzy_threshold],
        );
      }
    }
  });
});
