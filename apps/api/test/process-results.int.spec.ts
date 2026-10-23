import type { StepCode, StepResult } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { createApp } from "../src/app.factory.js";
import { OrchestratorApi } from "../src/modules/core/orchestrator/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { TASK_QUEUE_PORT, type TaskQueuePort } from "../src/platform/http/task-queue-port.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
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

const BRANCH_ID = "0192b6a9-0001-7000-8000-000000000001";
const ROUTE = { DATA_ENTRY: true, DEDUP: true, CREDIT_BUREAU: true, APPROVAL: true };

/** Tujuh hasil langkah dan keluar dari status menunggu (technical-specs 12 §12.3, 06 §6.13). */
describe("step results", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let reviewer: TestSession;
  let handlers: Map<StepCode, ScriptedStepHandler>;
  let createTask: MockInstance<TaskQueuePort["create"]>;
  const handler = (code: StepCode) => {
    const found = handlers.get(code);
    if (!found) throw new Error(`No test handler for ${code}`);
    return found;
  };
  const inTenant = <T>(fn: (api: OrchestratorApi, tx: Parameters<OrchestratorApi["start"]>[0]) => Promise<T>) =>
    app
      .get(TenantTx)
      .withTenantTx({ tenantId: seedCompanyIds.company001, userId: reviewer.userId }, (tx) =>
        fn(app.get(OrchestratorApi), tx),
      );

  /** Pengajuan yang langkah DEDUP-nya menghasilkan `result`, setelah semua job yang jatuh tempo dijalankan. */
  const atDedup = async (...results: StepResult[]) => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: ROUTE }]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    handler("DEDUP").script(applicationId, ...results);
    const processId = await startProcess(app, applicationId);
    await drainProcessJobs(app, db.owner);
    const dedup = (await latestSteps(db.owner, processId)).get("DEDUP");
    return { applicationId, processId, dedupId: dedup?.id ?? "" };
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    handlers = registerStepHandlers(app, ["DEDUP", "CREDIT_BUREAU", "APPROVAL"]);
    sales = await createSession(db.owner, { roleId: null });
    reviewer = await createSession(db.owner, { roleId: null });
  });

  beforeEach(() => {
    // Antrean tugas dibangun di BE-S2-02; uji ini memeriksa permintaan tugas yang dikirim orchestrator.
    createTask = vi.spyOn(app.get<TaskQueuePort>(TASK_QUEUE_PORT), "create").mockResolvedValue();
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("waits for a human task and continues when the task is closed (WAIT_HUMAN)", async () => {
    const { processId, dedupId, applicationId } = await atDedup({
      type: "WAIT_HUMAN",
      queueCode: "DEDUP_REVIEW",
      branchId: BRANCH_ID,
      summary: "Possible duplicate",
    });
    expect((await latestSteps(db.owner, processId)).get("DEDUP")?.status).toBe("WAITING_HUMAN");
    expect(await processStatus(db.owner, processId)).toBe("WAITING");
    expect(createTask).toHaveBeenCalledWith(expect.anything(), {
      stepExecutionId: dedupId,
      applicationId,
      queueCode: "DEDUP_REVIEW",
      branchId: BRANCH_ID,
      eligibleRoleId: null,
      assigneeUserId: null,
    });

    await inTenant((api, tx) => api.completeHumanStep(tx, dedupId, "NOT_DUPLICATE", {}, reviewer.userId));
    await drainProcessJobs(app, db.owner);

    expect((await latestSteps(db.owner, processId)).get("DEDUP")).toMatchObject({
      status: "COMPLETED",
      actor_user_id: reviewer.userId,
    });
    expect(await processStatus(db.owner, processId)).toBe("COMPLETED");
  });

  it("rejects closing a human task of a step that is no longer waiting (INVALID_STATE)", async () => {
    const { dedupId } = await atDedup();

    await expect(
      inTenant((api, tx) => api.completeHumanStep(tx, dedupId, "NOT_DUPLICATE", {}, reviewer.userId)),
    ).rejects.toMatchObject({ code: "INVALID_STATE", status: 409 });
  });

  it("waits for the provider and continues on the matching inbound result (WAIT_EXTERNAL)", async () => {
    const reference = `REF-${Date.now()}`;
    const deadline = new Date(Date.now() + 3_600_000);
    const { processId } = await atDedup({
      type: "WAIT_EXTERNAL",
      externalReference: reference,
      waitDeadline: deadline,
      summary: "Waiting",
    });
    expect((await latestSteps(db.owner, processId)).get("DEDUP")?.status).toBe("WAITING_EXTERNAL");

    expect(await inTenant((api, tx) => api.receiveExternal(tx, reference, { status: "OK" }))).toBe("MATCHED");
    expect(await inTenant((api, tx) => api.receiveExternal(tx, reference, { status: "OK" }))).toBe("DUPLICATE");
    expect(await inTenant((api, tx) => api.receiveExternal(tx, "REF-UNKNOWN", {}))).toBe("IGNORED_NOT_WAITING");
    expect((await latestSteps(db.owner, processId)).get("DEDUP")?.status).toBe("COMPLETED");
  });

  it("turns a wait past its deadline into a timeout error (IN-08)", async () => {
    const { processId } = await atDedup({
      type: "WAIT_EXTERNAL",
      externalReference: `REF-LATE-${Date.now()}`,
      waitDeadline: new Date(Date.now() + 1_000),
      summary: "Waiting",
    });
    await drainProcessJobs(app, db.owner, { includeDelayed: true });

    expect((await latestSteps(db.owner, processId)).get("DEDUP")).toMatchObject({
      status: "ERROR",
      error_category: "TIMEOUT",
      error_message: "No response from the provider before the wait deadline",
    });
    expect(await processStatus(db.owner, processId)).toBe("WAITING");
  });

  it("returns the application to draft with the note and cancels the process (BACK_TO_DRAFT)", async () => {
    const { applicationId, processId } = await atDedup({
      type: "BACK_TO_DRAFT",
      outcomeCode: "NOT_MATCH",
      returnNote: "KTP photo is blurred",
    });

    expect(await applicationState(db.owner, applicationId)).toEqual({
      status: "DRAFT",
      current_step: null,
      return_note: "KTP photo is blurred",
    });
    expect(await processStatus(db.owner, processId)).toBe("CANCELLED");
  });

  it("moves the application to recontest and requests a recontest task (RECONTEST)", async () => {
    const { applicationId, processId, dedupId } = await atDedup({
      type: "RECONTEST",
      outcomeCode: "NOTGO",
      summary: "Not Go",
    });

    expect((await applicationState(db.owner, applicationId))?.status).toBe("RECONTEST");
    expect(await processStatus(db.owner, processId)).toBe("CANCELLED");
    expect(createTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stepExecutionId: dedupId,
        queueCode: "RECONTEST",
        branchId: null,
      }),
    );
  });

  it("ends the process with the status chosen by the step and runs no later step (FINISH)", async () => {
    const { applicationId, processId } = await atDedup({
      type: "FINISH",
      outcomeCode: "HIGH_FRAUD",
      applicationStatus: "FINISHED_REJECTED",
      summary: "High fraud potential",
    });

    expect((await applicationState(db.owner, applicationId))?.status).toBe("FINISHED_REJECTED");
    expect(await processStatus(db.owner, processId)).toBe("COMPLETED");
    expect((await latestSteps(db.owner, processId)).get("CREDIT_BUREAU")?.status).toBe("PENDING");
  });
});
