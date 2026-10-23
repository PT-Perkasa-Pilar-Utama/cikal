import { errorEnvelopeSchema, processFinishResponseSchema, processMonitoringResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { OrchestratorApi } from "../src/modules/core/orchestrator/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { atDukcapil, auditActions, DUKCAPIL_TIMEOUT, monitoringRequest, openTasks } from "./support/monitoring.js";
import { applicationState, processStatus, registerStepHandlers, type ScriptedStepHandler } from "./support/process.js";
import { createSession, type TestSession } from "./support/session.js";
import { TASK_BRANCH_ID } from "./support/task.js";

const UNKNOWN_ID = "0192b6b1-ffff-7000-8000-000000000001";
const REASON = "Data nasabah ganda, dibatalkan cabang";
const FOUR_TIMEOUTS = [DUKCAPIL_TIMEOUT, DUKCAPIL_TIMEOUT, DUKCAPIL_TIMEOUT, DUKCAPIL_TIMEOUT];

type Response = { statusCode: number; body: string; json(): unknown };

/** Tombol "Finish" Process Monitoring (api-specs 13 §13.5; US-86). */
describe("process finish", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let dukcapil: ScriptedStepHandler;
  let admin: TestSession;
  let ops: ReturnType<typeof monitoringRequest>;

  const finish = (processId: string, payload: object = { reason: REASON }) =>
    ops.post(`/processes/${processId}/finish`, payload);
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
    ops = monitoringRequest(app, admin);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-86.02 finishes the process with the reason and cancels the application", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS);

    const res = await finish(failed.processId);

    expect(res.statusCode, res.body).toBe(200);
    expect(processFinishResponseSchema.parse(res.json())).toEqual({
      data: { processInstanceId: failed.processId, applicationStatus: "FINISHED_CANCELLED" },
      message: "Process finished",
    });
    expect((await applicationState(db.owner, failed.applicationId))?.status).toBe("FINISHED_CANCELLED");
    expect(await processStatus(db.owner, failed.processId)).toBe("CANCELLED");
    const { rows } = await db.owner.query<{ finish_reason: string }>(
      "select finish_reason from orchestrator.process_instances where id = $1",
      [failed.processId],
    );
    expect(rows[0]?.finish_reason).toBe(REASON);
    expect(await openTasks(db.owner, failed.applicationId)).toEqual([]);
    expect(await auditActions(db.owner, failed.processId)).toEqual([
      { action: "PROCESS_FINISHED", module: "Process Monitoring" },
    ]);
    const list = await ops.get(`/process-monitoring?q=${failed.loanId}`);
    expect(processMonitoringResponseSchema.parse(list.json()).data).toEqual([]);
  });

  it("closes the open task of a waiting step, so a late task result is rejected", async () => {
    const waiting = await atDukcapil(app, db.owner, dukcapil, {
      type: "WAIT_HUMAN",
      queueCode: "PRESCREEN_DUKCAPIL_L1",
      branchId: TASK_BRANCH_ID,
      summary: "Waiting for Dukcapil review",
    });
    expect(await openTasks(db.owner, waiting.applicationId)).toHaveLength(1);

    expect((await finish(waiting.processId)).statusCode).toBe(200);

    expect(await openTasks(db.owner, waiting.applicationId)).toEqual([]);
    await expect(
      app
        .get(TenantTx)
        .withTenantTx({ tenantId: seedCompanyIds.company001, userId: admin.userId }, (tx) =>
          app.get(OrchestratorApi).completeHumanStep(tx, waiting.dukcapilId, "MATCH", {}, admin.userId),
        ),
    ).rejects.toMatchObject({ code: "INVALID_STATE", status: 409 });
  });

  it("rejects finishing a process that already ended (INVALID_STATE)", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS);
    expect((await finish(failed.processId)).statusCode).toBe(200);

    expectError(
      await finish(failed.processId),
      409,
      "INVALID_STATE",
      "This action is not allowed in the current status",
    );
  });

  it("rejects an empty or missing reason (VALIDATION_FAILED)", async () => {
    const failed = await atDukcapil(app, db.owner, dukcapil, ...FOUR_TIMEOUTS);

    for (const payload of [{ reason: "   " }, {}]) {
      const body = expectError(
        await finish(failed.processId, payload),
        400,
        "VALIDATION_FAILED",
        "Please complete all required fields",
      );
      expect(body.details).toEqual([{ field: "reason", code: expect.any(String), message: "This field is required" }]);
    }
    expect(await processStatus(db.owner, failed.processId)).toBe("WAITING");
  });

  it("rejects an unknown process (NOT_FOUND)", async () => {
    expectError(await finish(UNKNOWN_ID), 404, "NOT_FOUND", "Data not found");
  });
});
