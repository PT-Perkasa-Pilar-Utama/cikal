import { applicationDukcapilResponseSchema, errorEnvelopeSchema, type StepCode } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { dukcapilSimulationNiks } from "../src/modules/addons/m07-dukcapil/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { Licensing, seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { Outbox } from "../src/platform/queue/outbox.js";
import { personalBody, sectionClient } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { installTestLicense, issueTestLicense, POC_LICENSE_MODULES } from "./support/license.js";
import {
  applicationState,
  drainProcessJobs,
  insertRoute,
  latestSteps,
  processStatus,
  registerStepHandlers,
  startProcess,
} from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const ROUTE: Partial<Record<StepCode, boolean>> = { DATA_ENTRY: true, DUKCAPIL: true, APPROVAL: true };
const MATCHING_NIK = "3171990000000101";
const MANUAL_REVIEW = "Manual review is not available in POC";
const RULE = {
  nameWeight: "60.0000",
  motherNameWeight: "40.0000",
  passedThreshold: "0.9000",
  reviewThreshold: "0.7500",
};

/** Langkah DUKCAPIL M07 dengan adapter simulasi dan DukcapilRule seed (api-specs 20, US-61). */
describe("dukcapil", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let client: ReturnType<typeof sectionClient>;

  /** Pemohon dengan section Personal lewat API yang prosesnya dijalankan sampai antrean job kosong. */
  const checked = async (nik: string, options: { withoutBirthDate?: boolean; includeDelayed?: boolean } = {}) => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: ROUTE }]);
    const id = await client.createDraft(sales, productId);
    await client.save(sales, id, "personal", personalBody({ idCardNumber: nik }));
    await db.owner.query(
      `update application.applications set status = 'ON_PROGRESS', submitted_at = now(), submitted_by = created_by
        where id = $1`,
      [id],
    );
    if (options.withoutBirthDate) {
      await db.owner.query(
        "update application.application_personals set date_of_birth = null where application_id = $1",
        [id],
      );
    }
    const processId = await startProcess(app, id);
    await drainProcessJobs(app, db.owner, { includeDelayed: options.includeDelayed ?? false });
    return { id, processId, dukcapil: (await latestSteps(db.owner, processId)).get("DUKCAPIL") };
  };
  const dukcapilOf = (applicationId: string, query = "") =>
    app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/dukcapil${query}`,
      headers: inquirer.headers,
    });
  const resultOf = async (applicationId: string) => {
    const res = await dukcapilOf(applicationId);
    expect(res.statusCode, res.body).toBe(200);
    return applicationDukcapilResponseSchema.parse(res.json());
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerStepHandlers(app, ["APPROVAL"]);
    const role = await createRole(db.owner, "Sales Dukcapil", [
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

  it("AC-61.01 TRM_DKC_001 passes a full match and continues", async () => {
    const { id, dukcapil } = await checked(MATCHING_NIK);

    expect(dukcapil).toMatchObject({ status: "COMPLETED", outcome_code: "PASSED" });
    expect((await resultOf(id)).data).toEqual({
      outcome: "PASSED",
      recordFound: true,
      providerCode: "SIMULATION_M07",
      providerReference: `SIM-${MATCHING_NIK}`,
      dobStatus: "MATCH",
      pobStatus: "MATCH",
      fullNameScore: "1.0000",
      motherNameScore: "1.0000",
      finalScore: "1.0000",
      rule: RULE,
      reviews: [],
    });
  });

  it("AC-61.01 TRM_DKC_002 passes a score exactly at the Passed threshold", async () => {
    const { id, dukcapil } = await checked(dukcapilSimulationNiks.scoreAtPassed);

    expect(dukcapil).toMatchObject({ status: "COMPLETED", outcome_code: "PASSED" });
    expect((await resultOf(id)).data).toMatchObject({ outcome: "PASSED", finalScore: "0.9000" });
  });

  it("AC-61.01 TRM_DKC_003 stops a score of 0.88 at Error because manual review is not in the POC", async () => {
    const { id, dukcapil } = await checked(dukcapilSimulationNiks.scoreInReview);

    expect(dukcapil).toMatchObject({ status: "ERROR", error_category: "BUSINESS_SETUP", error_message: MANUAL_REVIEW });
    expect((await resultOf(id)).data).toMatchObject({
      outcome: "REVIEW",
      fullNameScore: "0.9000",
      motherNameScore: "0.8500",
      finalScore: "0.8800",
    });
  });

  it("AC-61.01 TRM_DKC_004 stops a score exactly at the Review threshold at Error", async () => {
    const { id, dukcapil } = await checked(dukcapilSimulationNiks.scoreAtReview);

    expect(dukcapil).toMatchObject({ status: "ERROR", error_message: MANUAL_REVIEW });
    expect((await resultOf(id)).data).toMatchObject({ outcome: "REVIEW", finalScore: "0.7500" });
  });

  it("AC-61.01 TRM_DKC_005 fails a score below Review, finishes the application, and sends the rejection email", async () => {
    const { id, processId, dukcapil } = await checked(dukcapilSimulationNiks.scoreBelowReview);

    expect(dukcapil).toMatchObject({ status: "COMPLETED", outcome_code: "FAILED" });
    expect(await applicationState(db.owner, id)).toMatchObject({ status: "FINISHED_REJECTED" });
    expect(await processStatus(db.owner, processId)).toBe("COMPLETED");
    expect((await resultOf(id)).data).toMatchObject({ outcome: "FAILED", finalScore: "0.7400" });
    const { rows: events } = await db.owner.query<{ id: string }>(
      "select id from platform.outbox_events where aggregate_id = $1 and event_type = 'ApplicationRejected'",
      [id],
    );
    expect(events).toHaveLength(1);
    await app.get(Outbox).dispatch({ tenantId: seedCompanyIds.company001, eventId: events[0]?.id ?? "" });
    const { rows: emails } = await db.owner.query<{ template_code: string }>(
      "select template_code from notification.notification_logs where application_id = $1",
      [id],
    );
    expect(emails).toEqual([{ template_code: "APP_REJECTED" }]);
  });

  it("AC-61.01 TRM_DKC_006 fails a different date of birth without a score", async () => {
    const { id, dukcapil } = await checked(dukcapilSimulationNiks.dateOfBirthDiffers);

    expect(dukcapil).toMatchObject({ status: "COMPLETED", outcome_code: "FAILED" });
    expect((await resultOf(id)).data).toMatchObject({
      outcome: "FAILED",
      dobStatus: "NOT_MATCH",
      pobStatus: "MATCH",
      finalScore: null,
    });
  });

  it("AC-61.01 TRM_DKC_007 fails a different place of birth without a score", async () => {
    const { id, dukcapil } = await checked(dukcapilSimulationNiks.placeOfBirthDiffers);

    expect(dukcapil).toMatchObject({ status: "COMPLETED", outcome_code: "FAILED" });
    expect((await resultOf(id)).data).toMatchObject({ outcome: "FAILED", pobStatus: "NOT_MATCH", finalScore: null });
  });

  it("AC-61.01 TRM_DKC_008 skips Dukcapil without calling the provider when the date of birth is empty", async () => {
    const { id, dukcapil } = await checked(MATCHING_NIK, { withoutBirthDate: true });

    expect(dukcapil).toMatchObject({ status: "COMPLETED", outcome_code: "SKIP" });
    expect((await resultOf(id)).data).toMatchObject({ outcome: "SKIP", providerCode: null, finalScore: null });
    const { rows } = await db.owner.query(
      "select id from integration.integration_call_logs where application_id = $1",
      [id],
    );
    expect(rows).toEqual([]);
  });

  it("AC-61.02 shows Error with Dukcapil service timeout after the automatic retries time out", async () => {
    await db.owner.query("update integration.integration_configs set timeout_seconds = 1 where module_code = 'M07'");
    try {
      const { dukcapil } = await checked(dukcapilSimulationNiks.timeout, { includeDelayed: true });

      expect(dukcapil).toMatchObject({
        status: "ERROR",
        attempt: 4,
        error_category: "TIMEOUT",
        error_message: "Dukcapil service timeout",
      });
    } finally {
      await db.owner.query("update integration.integration_configs set timeout_seconds = 30 where module_code = 'M07'");
    }
  });

  it("answers NOT_FOUND for a process of another application", async () => {
    const { processId } = await checked(MATCHING_NIK);
    const other = await checked(MATCHING_NIK);

    const res = await dukcapilOf(other.id, `?processInstanceId=${processId}`);

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });

  it("answers APPLICATION_NOT_FOUND for an unknown application", async () => {
    const res = await dukcapilOf("0192b6ad-9999-7000-8000-000000000001");

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      message: "Application not found",
    });
  });

  it("answers MODULE_NOT_LICENSED when the company has no M07 licence", async () => {
    const { id } = await checked(MATCHING_NIK);
    await installTestLicense(db.owner, issueTestLicense({ modules: POC_LICENSE_MODULES.filter((m) => m !== "M07") }));
    app.get(Licensing).invalidate();
    try {
      const res = await dukcapilOf(id);

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
