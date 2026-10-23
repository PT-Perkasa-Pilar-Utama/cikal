import { errorEnvelopeSchema, processMonitoringResponseSchema, stepRetryResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { atDukcapil, auditActions, DUKCAPIL_TIMEOUT, monitoringRequest, openTasks } from "./support/monitoring.js";
import {
  CONTINUE,
  drainProcessJobs,
  latestSteps,
  registerStepHandlers,
  type ScriptedStepHandler,
} from "./support/process.js";
import { createRole, createSession, type TestSession } from "./support/session.js";
import { TASK_BRANCH_ID } from "./support/task.js";

const UNKNOWN_ID = "0192b6b1-ffff-7000-8000-000000000001";
const FOUR_TIMEOUTS = [DUKCAPIL_TIMEOUT, DUKCAPIL_TIMEOUT, DUKCAPIL_TIMEOUT, DUKCAPIL_TIMEOUT];

type Response = { statusCode: number; body: string; json(): unknown };

/** Process Monitoring: daftar dan Retry (api-specs 13 §13.3, §13.4; US-86). */
describe("process monitoring", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let dukcapil: ScriptedStepHandler;
  let admin: TestSession;
  let outsider: TestSession;
  let ops: ReturnType<typeof monitoringRequest>;

  const listOf = async (query: string) => {
    const res = await ops.get(`/process-monitoring?${query}`);
    expect(res.statusCode, res.body).toBe(200);
    return processMonitoringResponseSchema.parse(res.json());
  };
  const retryUrl = (processId: string, stepId: string) => `/processes/${processId}/steps/${stepId}/retry`;
  const expectError = (res: Response, status: number, code: string, message: string) => {
    expect(res.statusCode, res.body).toBe(status);
    const body = errorEnvelopeSchema.parse(res.json());
    expect(body).toMatchObject({ code, message });
    return body;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const handler = registerStepHandlers(app, ["DUKCAPIL", "APPROVAL"]).get("DUKCAPIL");
    if (!handler) throw new Error("DUKCAPIL handler missing");
    dukcapil = handler;
    admin = await createSession(db.owner, { roleId: seedRoleIds.adminOperasional });
    outsider = await createSession(db.owner, { roleId: null });
    ops = monitoringRequest(app, admin);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-86.04 shows only applications whose current step is Error, with the error message", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS);
    const waiting = await atDukcapil(app, db.owner, dukcapil, {
      type: "WAIT_HUMAN",
      queueCode: "PRESCREEN_DUKCAPIL_L1",
      branchId: TASK_BRANCH_ID,
      summary: "Waiting for Dukcapil review",
    });

    const errors = await listOf("status=ERROR&pageSize=100");

    expect(errors.data.every((item) => item.currentStep.status === "ERROR")).toBe(true);
    expect(errors.data.find((item) => item.applicationId === failed.applicationId)).toEqual({
      applicationId: failed.applicationId,
      loanId: failed.loanId,
      fullName: null,
      branchCode: null,
      processInstanceId: failed.processId,
      currentStep: {
        stepExecutionId: failed.dukcapilId,
        stepCode: "DUKCAPIL",
        status: "ERROR",
        attempt: 4,
        errorCategory: "TIMEOUT",
        errorMessage: "Dukcapil service timeout",
        startedAt: expect.any(String),
      },
    });
    expect(errors.data.some((item) => item.applicationId === waiting.applicationId)).toBe(false);
    const all = await listOf(`q=${waiting.loanId}`);
    expect(all.data.map((item) => item.currentStep.status)).toEqual(["WAITING_HUMAN"]);
    expect(all.meta).toEqual({ page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
  });

  it("AC-86.01 retries the error step and drops the application from the Error filter when it passes", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS, CONTINUE);
    expect(await openTasks(db.owner, failed.applicationId)).toEqual([{ queue_code: "PROCESS_ERROR" }]);

    const res = await ops.post(retryUrl(failed.processId, failed.dukcapilId));

    expect(res.statusCode, res.body).toBe(200);
    const body = stepRetryResponseSchema.parse(res.json());
    expect(body).toMatchObject({
      message: "Step retried",
      data: { stepCode: "DUKCAPIL", status: "COMPLETED", attempt: 5, outcomeCode: "PASSED" },
    });
    expect((await listOf(`status=ERROR&q=${failed.loanId}`)).data).toEqual([]);
    expect(await openTasks(db.owner, failed.applicationId)).toEqual([]);
    expect(await auditActions(db.owner, body.data.stepExecutionId)).toEqual([
      { action: "STEP_RETRIED", module: "Process Monitoring" },
    ]);
    await drainProcessJobs(app, db.owner);
    expect((await latestSteps(db.owner, failed.processId)).get("APPROVAL")?.status).toBe("COMPLETED");
  });

  it("AC-86.03 reports the failed retry, adds one attempt, and schedules no automatic retry", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS, DUKCAPIL_TIMEOUT);

    const res = await ops.post(retryUrl(failed.processId, failed.dukcapilId));

    const body = expectError(res, 422, "STEP_FAILED_AGAIN", "Step failed again: Dukcapil service timeout");
    expect(body.details).toEqual([
      { field: "attempt", code: "STEP_ATTEMPT", message: "5" },
      { field: "errorCategory", code: "TIMEOUT", message: "Dukcapil service timeout" },
    ]);
    const dukcapilStep = (await latestSteps(db.owner, failed.processId)).get("DUKCAPIL");
    expect(dukcapilStep).toMatchObject({ status: "ERROR", attempt: 5 });
    expect(await drainProcessJobs(app, db.owner, { includeDelayed: true })).toBe(0);
    expect(await openTasks(db.owner, failed.applicationId)).toEqual([{ queue_code: "PROCESS_ERROR" }]);
    const errors = await listOf(`status=ERROR&q=${failed.loanId}`);
    expect(errors.data[0]?.currentStep).toMatchObject({ stepExecutionId: dukcapilStep?.id, attempt: 5 });
  });

  it("rejects retrying a step that is not in Error (INVALID_STATE)", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS);
    const dataEntry = (await latestSteps(db.owner, failed.processId)).get("DATA_ENTRY")?.id ?? "";

    expectError(
      await ops.post(retryUrl(failed.processId, dataEntry)),
      409,
      "INVALID_STATE",
      "This action is not allowed in the current status",
    );
  });

  it("rejects retrying a step of another or unknown process (NOT_FOUND)", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS);

    expectError(await ops.post(retryUrl(UNKNOWN_ID, failed.dukcapilId)), 404, "NOT_FOUND", "Data not found");
    expectError(await ops.post(retryUrl(failed.processId, UNKNOWN_ID)), 404, "NOT_FOUND", "Data not found");
  });

  it("requires an Idempotency-Key on retry (IDEMPOTENCY_KEY_REQUIRED)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1${retryUrl(UNKNOWN_ID, UNKNOWN_ID)}`,
      headers: admin.headers,
    });

    expectError(res, 400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required");
  });

  it("rejects a user without Process Monitoring access (ACCESS_DENIED)", async () => {
    const res = await monitoringRequest(app, outsider).get("/process-monitoring");

    expectError(res, 403, "ACCESS_DENIED", "You do not have access to this page");
  });

  it("rejects Retry and Finish for a viewer without UPDATE rights (ACTION_DENIED)", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS);
    const viewerRole = await createRole(db.owner, "Monitoring Viewer", [{ menuCode: "OPS-MONITORING", view: true }]);
    const viewer = monitoringRequest(app, await createSession(db.owner, { roleId: viewerRole }));

    expect((await viewer.get(`/process-monitoring?q=${failed.loanId}`)).statusCode).toBe(200);
    for (const res of [
      await viewer.post(retryUrl(failed.processId, failed.dukcapilId)),
      await viewer.post(`/processes/${failed.processId}/finish`, { reason: "Dibatalkan" }),
    ]) {
      expectError(res, 403, "ACTION_DENIED", "You do not have permission to perform this action");
    }
  });
});
