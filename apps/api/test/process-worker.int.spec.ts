import type { INestApplicationContext } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWorkerContext } from "../src/app.factory.js";
import { JobQueue } from "../src/platform/queue/job-queue.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import {
  insertApplication,
  insertRoute,
  processStatus,
  registerStepHandlers,
  startProcess,
} from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createSession, type TestSession } from "./support/session.js";

const WAIT_MS = 15_000;
const POLL_MS = 200;

/** Proses worker: konsumen pg-boss menjalankan `orchestrator.advance` sampai proses selesai (NF-24). */
describe("worker", () => {
  let db: TestDatabase;
  let worker: INestApplicationContext;
  let sales: TestSession;

  const submit = async () => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [
      { versionNumber: 1, status: "ACTIVE", steps: { DATA_ENTRY: true, DEDUP: true, APPROVAL: true } },
    ]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    return startProcess(worker, applicationId);
  };
  const completed = async (processId: string) => {
    const until = Date.now() + WAIT_MS;
    while (Date.now() < until) {
      if ((await processStatus(db.owner, processId)) === "COMPLETED") return true;
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
    return false;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    worker = await createWorkerContext({ ...db.config, processRole: "worker" });
    registerStepHandlers(worker, ["DEDUP", "APPROVAL"]);
    await worker.get(JobQueue).startConsumers();
    sales = await createSession(db.owner, { roleId: null });
  });

  afterAll(async () => {
    await worker?.close();
    await db?.stop();
  });

  it("runs a submitted process to completion from the advance queue", async () => {
    expect(await completed(await submit())).toBe(true);
  });

  it("resumes consuming after the consumers stop and start again, as around a reset", async () => {
    const queue = worker.get(JobQueue);
    await queue.stopConsumers();
    const processId = await submit();
    await queue.startConsumers();

    expect(await completed(processId)).toBe(true);
  });

  it("schedules the call log partition maintenance daily at 01.00 Asia/Jakarta, again after a restart", async () => {
    const schedule = () =>
      db.owner.query<{ cron: string; timezone: string }>(
        "select cron, timezone from pgboss.schedule where name = 'integration.call-log-partitions'",
      );
    const queue = worker.get(JobQueue);
    await queue.stopConsumers();
    await db.owner.query("delete from pgboss.schedule");
    await queue.startConsumers();

    expect((await schedule()).rows).toEqual([{ cron: "0 1 * * *", timezone: "Asia/Jakarta" }]);
  });
});
