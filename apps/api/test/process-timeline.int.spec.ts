import { errorEnvelopeSchema, processTimelineResponseSchema, type StepCode, skipReasonLabels } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { Licensing } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { installTestLicense, issueTestLicense, POC_LICENSE_MODULES } from "./support/license.js";
import {
  drainProcessJobs,
  insertApplication,
  insertRoute,
  registerStepHandlers,
  type ScriptedStepHandler,
  startProcess,
} from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const COMPANY_002 = "0192b6a0-0002-7000-8000-000000000002";
const UNKNOWN_ID = "0192b6b0-ffff-7000-8000-000000000001";
const KTA_WITHOUT_SURVEY = { DATA_ENTRY: true, SURVEY: false, DEDUP: true, CREDIT_BUREAU: true, APPROVAL: true };

/** `GET /applications/{id}/process`, tab "Workflow" (api-specs 13 §13.2). */
describe("/applications/{id}/process", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let outsider: TestSession;
  let salesUsername: string;
  let handlers: Map<StepCode, ScriptedStepHandler>;

  const get = (session: TestSession, url: string) =>
    app.inject({ method: "GET", url: `/api/v1/applications/${url}`, headers: session.headers });
  const timelineOf = async (url: string) => {
    const res = await get(sales, url);
    expect(res.statusCode, res.body).toBe(200);
    return processTimelineResponseSchema.parse(res.json()).data;
  };
  const expectError = (res: { statusCode: number; json(): unknown }, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  const submittedKta = async (script?: (applicationId: string) => void) => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 2, status: "ACTIVE", steps: KTA_WITHOUT_SURVEY }]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    script?.(applicationId);
    const processId = await startProcess(app, applicationId);
    await drainProcessJobs(app, db.owner);
    return { productId, applicationId, processId };
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    handlers = registerStepHandlers(app, ["DEDUP", "CREDIT_BUREAU", "APPROVAL"]);
    const inquiry = await createRole(db.owner, "Sales Inquiry", [{ menuCode: "APP-INQUIRY", view: true }]);
    sales = await createSession(db.owner, { roleId: inquiry });
    outsider = await createSession(db.owner, { roleId: null });
    const { rows } = await db.owner.query<{ username: string }>("select username from iam.users where id = $1", [
      sales.userId,
    ]);
    salesUsername = rows[0]?.username ?? "";
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("shows every step of the locked route version in standard order with actor, aging, and result", async () => {
    const { applicationId, processId } = await submittedKta();

    const timeline = await timelineOf(`${applicationId}/process`);

    expect(timeline).toMatchObject({ applicationId, selectedProcessId: processId, routeVersion: 2 });
    expect(timeline.processes).toEqual([{ id: processId, recontestNumber: 0, label: "Initial", status: "COMPLETED" }]);
    expect(timeline.steps.map((step) => step.stepCode).slice(0, 6)).toEqual([
      "DATA_ENTRY",
      "SURVEY",
      "DEDUP",
      "DUKCAPIL",
      "NAME_SCREENING",
      "VERIFICATION",
    ]);
    expect(timeline.steps[0]).toMatchObject({
      status: "COMPLETED",
      aging: "2",
      actor: { type: "USER", username: salesUsername },
    });
    expect(timeline.steps.find((step) => step.stepCode === "DEDUP")).toMatchObject({
      status: "COMPLETED",
      outcomeCode: "PASSED",
      aging: "0",
      actor: { type: "SYSTEM" },
    });
  });

  it("shows Survey as Skipped - not in route when the KTA route does not use it (AC-85.02)", async () => {
    const { applicationId } = await submittedKta();

    const survey = (await timelineOf(`${applicationId}/process`)).steps.find((step) => step.stepCode === "SURVEY");

    expect(survey).toMatchObject({ status: "SKIPPED", skipReason: "NOT_IN_ROUTE", actor: null, aging: null });
    expect(survey?.skipReason && skipReasonLabels[survey.skipReason]).toBe("Skipped - not in route");
  });

  it("shows SLIK as Skipped - not licensed when the company has no M10 licence (AC-85.06)", async () => {
    const withoutM10 = POC_LICENSE_MODULES.filter((code) => code !== "M10");
    await installTestLicense(db.owner, issueTestLicense({ modules: withoutM10 }));
    app.get(Licensing).invalidate();
    try {
      const { applicationId } = await submittedKta();

      const slik = (await timelineOf(`${applicationId}/process`)).steps.find((s) => s.stepCode === "CREDIT_BUREAU");

      expect(slik).toMatchObject({ status: "SKIPPED", skipReason: "NOT_LICENSED" });
      expect(slik?.skipReason && skipReasonLabels[slik.skipReason]).toBe("Skipped - not licensed");
      expect(handlers.get("CREDIT_BUREAU")?.contexts.some((ctx) => ctx.applicationId === applicationId)).toBe(false);
    } finally {
      await installTestLicense(db.owner, issueTestLicense());
      app.get(Licensing).invalidate();
    }
  });

  it("shows a conditional step as Skipped - condition not met (AC-31.04)", async () => {
    const { applicationId } = await submittedKta((id) => handlers.get("CREDIT_BUREAU")?.skipFor(id));

    const step = (await timelineOf(`${applicationId}/process`)).steps.find((s) => s.stepCode === "CREDIT_BUREAU");

    expect(step?.skipReason && skipReasonLabels[step.skipReason]).toBe("Skipped - condition not met");
  });

  it("keeps the first process selectable after the application is submitted again", async () => {
    const { applicationId, processId: first } = await submittedKta((id) =>
      handlers.get("DEDUP")?.script(id, { type: "BACK_TO_DRAFT", outcomeCode: "NOT_MATCH", returnNote: "Fix KTP" }),
    );
    await db.owner.query("update application.applications set status = 'ON_PROGRESS' where id = $1", [applicationId]);
    const second = await startProcess(app, applicationId);

    const latest = await timelineOf(`${applicationId}/process`);
    const earlier = await timelineOf(`${applicationId}/process?processInstanceId=${first}`);

    expect(latest.processes.map((process) => [process.id, process.status])).toEqual([
      [first, "CANCELLED"],
      [second, "RUNNING"],
    ]);
    expect(latest.selectedProcessId).toBe(second);
    expect(earlier.selectedProcessId).toBe(first);
    expect(earlier.steps.find((step) => step.stepCode === "DEDUP")?.outcomeCode).toBe("NOT_MATCH");
  });

  it("rejects a draft that was never submitted (PROCESS_NOT_STARTED, AC-85.05)", async () => {
    const productId = await insertProduct(db.owner);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId, status: "DRAFT" });

    expectError(
      await get(sales, `${applicationId}/process`),
      409,
      "PROCESS_NOT_STARTED",
      "Process has not started. Submit the application to start the process",
    );
  });

  it("rejects an unknown application (APPLICATION_NOT_FOUND)", async () => {
    expectError(await get(sales, `${UNKNOWN_ID}/process`), 404, "APPLICATION_NOT_FOUND", "Application not found");
  });

  it("hides an application of another company (APPLICATION_NOT_FOUND)", async () => {
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [COMPANY_002],
    );
    const productId = await insertProduct(db.owner, { tenantId: COMPANY_002 });
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: null, tenantId: COMPANY_002 });

    expectError(await get(sales, `${applicationId}/process`), 404, "APPLICATION_NOT_FOUND", "Application not found");
  });

  it("rejects a process of another application (NOT_FOUND)", async () => {
    const { applicationId } = await submittedKta();

    expectError(
      await get(sales, `${applicationId}/process?processInstanceId=${UNKNOWN_ID}`),
      404,
      "NOT_FOUND",
      "Data not found",
    );
  });

  it("rejects a process id that is not a uuid (VALIDATION_FAILED)", async () => {
    const { applicationId } = await submittedKta();

    expectError(
      await get(sales, `${applicationId}/process?processInstanceId=initial`),
      400,
      "VALIDATION_FAILED",
      "Please complete all required fields",
    );
  });

  it("rejects a user without Application Inquiry access (ACCESS_DENIED)", async () => {
    const { applicationId } = await submittedKta();

    expectError(
      await get(outsider, `${applicationId}/process`),
      403,
      "ACCESS_DENIED",
      "You do not have access to this page",
    );
  });
});
