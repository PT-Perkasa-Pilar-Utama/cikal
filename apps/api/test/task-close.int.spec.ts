import { taskListResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { type TaskClosing, TaskQueue } from "../src/modules/core/task-queue/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import {
  drainProcessJobs,
  latestSteps,
  processStatus,
  registerStepHandlers,
  type ScriptedStepHandler,
} from "./support/process.js";
import { createSession, type TestSession } from "./support/session.js";
import { taskRow, verificationTask } from "./support/task.js";

/** Penutupan tugas lewat `taskQueue.close` dan tugas PROCESS_ERROR (api-specs 14 §14.5, technical-specs 12 §12.3). */
describe("task close", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let verification: ScriptedStepHandler;
  let veri01: TestSession;
  let veri02: TestSession;
  let adminOperasional: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const handler = registerStepHandlers(app, ["VERIFICATION", "APPROVAL"]).get("VERIFICATION");
    if (!handler) throw new Error("VERIFICATION handler missing");
    verification = handler;
    veri01 = await createSession(db.owner, { roleId: seedRoleIds.verifikator });
    veri02 = await createSession(db.owner, { roleId: seedRoleIds.verifikator });
    adminOperasional = await createSession(db.owner, { roleId: seedRoleIds.adminOperasional });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const assign = (session: TestSession, taskId: string, version: number) =>
    app.inject({
      method: "POST",
      url: `/api/v1/tasks/${taskId}/assign`,
      headers: session.headers,
      payload: { version },
    });
  const close = (taskId: string, closing: TaskClosing) =>
    app
      .get(TenantTx)
      .withTenantTx({ tenantId: seedCompanyIds.company001, userId: closing.userId }, (tx) =>
        app.get(TaskQueue).close(tx, taskId, closing),
      );
  const allMatch = (userId: string): TaskClosing => ({ userId, resultCode: "ALL_MATCH", payload: {} });

  it("closes the owner's task and hands the result to the orchestrator", async () => {
    const task = await verificationTask(app, db.owner, verification);
    await assign(veri01, task.id, task.version);

    await close(task.id, allMatch(veri01.userId));
    await drainProcessJobs(app, db.owner);

    expect(await taskRow(db.owner, task.id)).toMatchObject({ status: "CLOSED", result_code: "ALL_MATCH" });
    expect((await latestSteps(db.owner, task.processInstanceId)).get("VERIFICATION")).toMatchObject({
      status: "COMPLETED",
      actor_user_id: veri01.userId,
    });
    expect(await processStatus(db.owner, task.processInstanceId)).toBe("COMPLETED");
  });

  it("AC-58.02 rejects closing another user's task (TASK_NOT_ASSIGNED_TO_YOU)", async () => {
    const task = await verificationTask(app, db.owner, verification);
    await assign(veri01, task.id, task.version);

    await expect(close(task.id, allMatch(veri02.userId))).rejects.toMatchObject({
      code: "TASK_NOT_ASSIGNED_TO_YOU",
      status: 403,
      message: "This task is assigned to another user",
    });
    expect((await taskRow(db.owner, task.id)).status).toBe("ASSIGNED");
  });

  it("rejects closing a task twice with the closing module's text (ALREADY_PROCESSED)", async () => {
    const task = await verificationTask(app, db.owner, verification);
    await assign(veri01, task.id, task.version);
    await close(task.id, allMatch(veri01.userId));

    await expect(
      close(task.id, { ...allMatch(veri01.userId), alreadyProcessedMessage: "This verification has been submitted" }),
    ).rejects.toMatchObject({
      code: "ALREADY_PROCESSED",
      status: 409,
      message: "This verification has been submitted",
    });
  });

  it("rejects Assign to Me on a closed task (INVALID_STATE)", async () => {
    const task = await verificationTask(app, db.owner, verification);
    await assign(veri01, task.id, task.version);
    await close(task.id, allMatch(veri01.userId));

    const res = await assign(veri01, task.id, task.version + 2);
    expect(res.statusCode, res.body).toBe(409);
    expect(res.json()).toMatchObject({
      code: "INVALID_STATE",
      message: "This action is not allowed in the current status",
    });
  });

  it("opens a PROCESS_ERROR task in Process Monitoring when a step fails without automatic retry", async () => {
    const task = await verificationTask(app, db.owner, verification, {
      type: "ERROR",
      errorCategory: "BUSINESS_SETUP",
      errorMessage: "Verification setup is missing",
      retryable: false,
    });
    expect(await processStatus(db.owner, task.processInstanceId)).toBe("WAITING");

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/tasks?queueCode=PROCESS_ERROR&q=${task.loanId}`,
      headers: adminOperasional.headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(taskListResponseSchema.parse(res.json()).data).toMatchObject([
      { queueCode: "PROCESS_ERROR", loanId: task.loanId, status: "OPEN", allowedActions: ["ASSIGN"] },
    ]);
  });
});
