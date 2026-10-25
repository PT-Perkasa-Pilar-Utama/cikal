import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { TASK_QUEUE_PORT, type TaskQueuePort } from "../src/platform/http/task-queue-port.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import {
  activateRouteVersion,
  applicationState,
  drainProcessJobs,
  insertApplication,
  insertRoute,
  latestSteps,
  registerStepHandlers,
  type ScriptedStepHandler,
  startProcess,
} from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createSession, type TestSession } from "./support/session.js";

const KTA_ROUTE = { DATA_ENTRY: true, SURVEY: true, DEDUP: true, RAC: true, APPROVAL: true };

/** `orchestrator.start`: versi rute dan snapshot parameter saat submit (technical-specs 12 §12.1, api-specs 12 §12.8). */
describe("process start", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let handlers: Map<string, ScriptedStepHandler>;
  const handler = (code: string) => {
    const found = handlers.get(code);
    if (!found) throw new Error(`No test handler for ${code}`);
    return found;
  };
  const processRow = async (id: string) =>
    (
      await db.owner.query<{ route_version_id: string; parameter_snapshot: Record<string, string>; status: string }>(
        "select route_version_id, parameter_snapshot, status from orchestrator.process_instances where id = $1",
        [id],
      )
    ).rows[0];

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    handlers = registerStepHandlers(app, ["DEDUP", "RAC", "APPROVAL"]);
    // Antrean tugas dibangun di BE-S2-02; uji ini hanya memeriksa permintaan tugasnya.
    vi.spyOn(app.get<TaskQueuePort>(TASK_QUEUE_PORT), "create").mockResolvedValue();
    sales = await createSession(db.owner, { roleId: null });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("locks the active route version and completes Data Entry by the submitter", async () => {
    const productId = await insertProduct(db.owner);
    const [versionId] = await insertRoute(db.owner, productId, [
      { versionNumber: 1, status: "ACTIVE", steps: KTA_ROUTE },
    ]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });

    const processId = await startProcess(app, applicationId);

    expect(await processRow(processId)).toMatchObject({ route_version_id: versionId, status: "RUNNING" });
    const steps = await latestSteps(db.owner, processId);
    expect(steps.size).toBe(18);
    expect(steps.get("DATA_ENTRY")).toMatchObject({ status: "COMPLETED", actor_user_id: sales.userId });
    expect(steps.get("SURVEY")).toMatchObject({ status: "PENDING", attempt: 1 });
  });

  it("enqueues the first advance job in the submit transaction", async () => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: KTA_ROUTE }]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });

    const processId = await startProcess(app, applicationId);

    const { rows } = await db.owner.query(
      "select data from pgboss.job where name = 'orchestrator.advance' and data->>'processInstanceId' = $1",
      [processId],
    );
    expect(rows).toEqual([{ data: { tenantId: expect.any(String), processInstanceId: processId } }]);
  });

  it("keeps a running application on route version 2 after version 3 is approved (AC-31.03)", async () => {
    const productId = await insertProduct(db.owner);
    const [v2, v3] = await insertRoute(db.owner, productId, [
      { versionNumber: 2, status: "ACTIVE", steps: KTA_ROUTE },
      { versionNumber: 3, status: "WAITING_APPROVAL", steps: { ...KTA_ROUTE, SURVEY: false } },
    ]);
    const running = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    handler("DEDUP").script(running, {
      type: "WAIT_HUMAN",
      queueCode: "DEDUP_REVIEW",
      branchId: seedOrganizationIds.bandung,
      summary: "Review",
    });
    const runningProcess = await startProcess(app, running);
    await drainProcessJobs(app, db.owner);
    expect((await latestSteps(db.owner, runningProcess)).get("DEDUP")?.status).toBe("WAITING_HUMAN");

    await activateRouteVersion(db.owner, v2 ?? "", v3 ?? "");
    const after = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    const afterProcess = await startProcess(app, after);
    await drainProcessJobs(app, db.owner);

    expect((await processRow(runningProcess))?.route_version_id).toBe(v2);
    expect((await processRow(afterProcess))?.route_version_id).toBe(v3);
    // Versi 2 menyalakan Survey (M05 tak berlisensi); versi 3 mematikannya.
    expect((await latestSteps(db.owner, runningProcess)).get("SURVEY")?.skip_reason).toBe("NOT_LICENSED");
    expect((await latestSteps(db.owner, afterProcess)).get("SURVEY")?.skip_reason).toBe("NOT_IN_ROUTE");
  });

  it("evaluates RAC with the DBR Max in force at submit after a later product change (AC-20.08)", async () => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: KTA_ROUTE }]);
    const before = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    const beforeProcess = await startProcess(app, before);

    await db.owner.query("update product.products set dbr_max = 35 where id = $1", [productId]);
    const after = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    const afterProcess = await startProcess(app, after);
    await drainProcessJobs(app, db.owner);

    const racContext = (processId: string) =>
      handler("RAC").contexts.find((ctx) => ctx.processInstanceId === processId)?.parameterSnapshot;
    expect(racContext(beforeProcess)).toMatchObject({ PRODUCT_DBR_MAX: "40.0000", CORE_MAX_TENOR_MONTHS: "60" });
    expect(racContext(afterProcess)).toMatchObject({ PRODUCT_DBR_MAX: "35.0000" });
  });

  it("rejects a product without an active route (PRODUCT_NOT_AVAILABLE)", async () => {
    const productId = await insertProduct(db.owner);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });

    await expect(startProcess(app, applicationId)).rejects.toMatchObject({
      code: "PRODUCT_NOT_AVAILABLE",
      status: 422,
      message: "Selected product is not available",
    });
  });

  it("rejects starting a draft application (INVALID_STATE)", async () => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: KTA_ROUTE }]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId, status: "DRAFT" });

    await expect(startProcess(app, applicationId)).rejects.toMatchObject({ code: "INVALID_STATE", status: 409 });
  });

  it("rejects a second process while one is running (INVALID_STATE)", async () => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: KTA_ROUTE }]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    await startProcess(app, applicationId);

    await expect(startProcess(app, applicationId)).rejects.toMatchObject({ code: "INVALID_STATE", status: 409 });
    expect((await applicationState(db.owner, applicationId))?.status).toBe("ON_PROGRESS");
  });

  it("rejects an application of another tenant (APPLICATION_NOT_FOUND)", async () => {
    const productId = await insertProduct(db.owner);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });

    await expect(startProcess(app, applicationId, "0192b6a0-0009-7000-8000-000000000009")).rejects.toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      status: 404,
      message: "Application not found",
    });
  });
});
