import { applicationDecisionResponseSchema, errorEnvelopeSchema, type StepCode } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedDecisionMatrixRows } from "../src/modules/addons/m11-decision/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { Licensing } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { installTestLicense, issueTestLicense, POC_LICENSE_MODULES } from "./support/license.js";
import {
  applicationState,
  drainProcessJobs,
  insertApplication,
  insertRoute,
  latestSteps,
  processStatus,
  registerStepHandlers,
  type ScriptedStepHandler,
  startProcess,
} from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createSession, type TestSession } from "./support/session.js";

const MODULE_STEPS = ["DEDUP", "DUKCAPIL", "FRAUD", "RAC", "SCORING", "CREDIT_BUREAU"] as const;
type ModuleStep = (typeof MODULE_STEPS)[number];
const CLEAN: Record<ModuleStep, string> = {
  DEDUP: "UNMATCH",
  DUKCAPIL: "PASSED",
  FRAUD: "CLEAN",
  RAC: "PASS",
  SCORING: "PASS",
  CREDIT_BUREAU: "COLLECT_1",
};
const FULL_ROUTE: Partial<Record<StepCode, boolean>> = {
  DATA_ENTRY: true,
  ...Object.fromEntries(MODULE_STEPS.map((step) => [step, true])),
  DECISION: true,
  APPROVAL: true,
};
const seedRow = (priority: number) => seedDecisionMatrixRows.find((row) => row.priority === priority);

/** Decision Engine M11: langkah DECISION dan keputusan pengajuan (api-specs 24 §24.1, §24.4, US-69). */
describe("decision engine", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let handlers: Map<StepCode, ScriptedStepHandler>;

  /** Pengajuan yang keenam langkahnya menghasilkan `outcomes`, dijalankan sampai antrean job kosong. */
  const decided = async (
    outcomes: Partial<Record<ModuleStep, string>> = {},
    route: Partial<Record<StepCode, boolean>> = {},
  ) => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [
      { versionNumber: 1, status: "ACTIVE", steps: { ...FULL_ROUTE, ...route } },
    ]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    for (const step of MODULE_STEPS) {
      const outcomeCode = { ...CLEAN, ...outcomes }[step];
      handlers.get(step)?.script(applicationId, { type: "CONTINUE", outcomeCode, summary: outcomeCode });
    }
    const processId = await startProcess(app, applicationId);
    await drainProcessJobs(app, db.owner);
    return { applicationId, processId, decision: (await latestSteps(db.owner, processId)).get("DECISION") };
  };
  const decisionOf = (applicationId: string, query = "") =>
    app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/decision${query}`,
      headers: inquirer.headers,
    });
  const decisionBody = async (applicationId: string) => {
    const res = await decisionOf(applicationId);
    expect(res.statusCode).toBe(200);
    return applicationDecisionResponseSchema.parse(res.json()).data;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    handlers = registerStepHandlers(app, [...MODULE_STEPS, "APPROVAL"]);
    sales = await createSession(db.owner, { roleId: null });
    inquirer = await createSession(db.owner, { roleId: seedRoleIds.riskManager });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-69.01 decides Go with the matrix row used and continues to Approval", async () => {
    const { applicationId, processId, decision } = await decided();

    expect(decision).toMatchObject({ status: "COMPLETED", outcome_code: "GO" });
    expect(await processStatus(db.owner, processId)).toBe("COMPLETED");
    expect(await decisionBody(applicationId)).toEqual({
      decisionOutcome: "GO",
      outcomes: {
        dedup: "UNMATCH",
        dukcapil: "PASSED",
        fraud: "CLEAN",
        rac: "PASS",
        scoring: "PASS",
        creditBureau: "COLLECT_1",
      },
      matchedRow: { id: seedRow(4)?.id, priority: 4 },
      description: null,
      nextStep: "APPROVAL",
    });
  });

  it("AC-69.02 decides NotGo for RAC Fail and moves the application to Recontest without an email", async () => {
    const { applicationId, processId, decision } = await decided({ RAC: "FAIL" });

    expect(decision).toMatchObject({ status: "COMPLETED", outcome_code: "NOTGO" });
    expect(await applicationState(db.owner, applicationId)).toMatchObject({ status: "RECONTEST" });
    expect(await processStatus(db.owner, processId)).toBe("CANCELLED");
    const { rows: tasks } = await db.owner.query<{ queue_code: string }>(
      "select queue_code from taskqueue.human_tasks where application_id = $1",
      [applicationId],
    );
    expect(tasks.map((task) => task.queue_code)).toEqual(["RECONTEST"]);
    const { rows: emails } = await db.owner.query(
      "select id from notification.notification_logs where application_id = $1",
      [applicationId],
    );
    expect(emails).toEqual([]);
    expect(await decisionBody(applicationId)).toMatchObject({
      decisionOutcome: "NOTGO",
      matchedRow: { id: seedRow(2)?.id, priority: 2 },
      nextStep: null,
    });
  });

  it("AC-69.03 shows SLIK as Skip when the product route turns SLIK off", async () => {
    const { applicationId } = await decided({}, { CREDIT_BUREAU: false });

    expect(await decisionBody(applicationId)).toMatchObject({
      decisionOutcome: "GO",
      outcomes: { creditBureau: "SKIP" },
      matchedRow: { id: seedRow(7)?.id, priority: 7 },
    });
  });

  it("AC-36.03 decides the default NotGo with its note when no matrix row matches", async () => {
    const { applicationId, decision } = await decided({ FRAUD: "SUSPICIOUS_CLEARED" });

    expect(decision).toMatchObject({ outcome_code: "NOTGO" });
    expect(await decisionBody(applicationId)).toMatchObject({
      decisionOutcome: "NOTGO",
      matchedRow: null,
      description: "No matching rule, default decision applied",
    });
  });

  it("AC-36.05 uses the priority 1 [ANY] row for SLIK Collect 5 with Scoring Pass", async () => {
    const { applicationId } = await decided({ CREDIT_BUREAU: "COLLECT_5" });

    expect(await decisionBody(applicationId)).toMatchObject({
      decisionOutcome: "NOTGO",
      matchedRow: { id: seedRow(1)?.id, priority: 1 },
    });
  });

  it("stops at ERROR without retry when a step outcome is not a Decision Matrix value", async () => {
    const { decision } = await decided({ DUKCAPIL: "REVIEW" });

    expect(decision).toMatchObject({
      status: "ERROR",
      error_category: "CONFIG",
      error_message: "Step DUKCAPIL outcome REVIEW is not a Decision Matrix value",
    });
  });

  it("answers the decision of the requested process", async () => {
    const { applicationId, processId } = await decided();

    const res = await decisionOf(applicationId, `?processInstanceId=${processId}`);

    expect(applicationDecisionResponseSchema.parse(res.json()).data.decisionOutcome).toBe("GO");
  });

  it("answers APPLICATION_NOT_FOUND for an unknown application", async () => {
    const res = await decisionOf("0192b6ad-9999-7000-8000-000000000001");

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      message: "Application not found",
    });
  });

  it("answers NOT_FOUND for an application that has not reached Decision", async () => {
    const productId = await insertProduct(db.owner);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });

    const res = await decisionOf(applicationId);

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });

  it("answers MODULE_NOT_LICENSED when the company has no M11 licence", async () => {
    const { applicationId } = await decided();
    await installTestLicense(db.owner, issueTestLicense({ modules: POC_LICENSE_MODULES.filter((m) => m !== "M11") }));
    app.get(Licensing).invalidate();
    try {
      const res = await decisionOf(applicationId);

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
