import type { StepCode, StepResult } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { ADVANCE_QUEUE } from "../src/modules/core/orchestrator/jobs/queues.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
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

const TIMEOUT: StepResult = {
  type: "ERROR",
  errorCategory: "TIMEOUT",
  errorMessage: "Dukcapil service timeout",
  retryable: true,
};

/** Siklus `advance`: alasan lewati, ERROR dan retry otomatis, idempotensi (technical-specs 12 §12.3). */
describe("process advance", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let handlers: Map<StepCode, ScriptedStepHandler>;
  const handler = (code: StepCode) => {
    const found = handlers.get(code);
    if (!found) throw new Error(`No test handler for ${code}`);
    return found;
  };

  /** Pengajuan baru dengan rute satu versi ACTIVE, sudah disubmit dan prosesnya dimulai. */
  const submitted = async (steps: Partial<Record<StepCode, boolean>>, script?: (applicationId: string) => void) => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps }]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: sales.userId });
    script?.(applicationId);
    const processId = await startProcess(app, applicationId);
    return { applicationId, processId };
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    handlers = registerStepHandlers(app, ["DEDUP", "DUKCAPIL", "CREDIT_BUREAU", "APPROVAL"]);
    sales = await createSession(db.owner, { roleId: null });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("skips a step turned off in the route as not in route (AC-85.02)", async () => {
    const { processId } = await submitted({ DATA_ENTRY: true, SURVEY: false, DEDUP: true, APPROVAL: true });
    await drainProcessJobs(app, db.owner);

    expect((await latestSteps(db.owner, processId)).get("SURVEY")).toMatchObject({
      status: "SKIPPED",
      skip_reason: "NOT_IN_ROUTE",
    });
  });

  it("skips the NAME_SCREENING slot as not licensed and a licensed step missing from the route as not in route", async () => {
    const { processId } = await submitted({ DATA_ENTRY: true, DEDUP: true, APPROVAL: true });
    await drainProcessJobs(app, db.owner);

    const steps = await latestSteps(db.owner, processId);
    expect(steps.get("NAME_SCREENING")).toMatchObject({ status: "SKIPPED", skip_reason: "NOT_LICENSED" });
    expect(steps.get("FRAUD")).toMatchObject({ status: "SKIPPED", skip_reason: "NOT_IN_ROUTE" });
  });

  it("skips a conditional step whose condition is not met without running it (AC-31.04)", async () => {
    // SIKP (M12) tidak berlisensi di POC; langkah bersyarat diuji dengan modul berlisensi.
    const { applicationId, processId } = await submitted(
      { DATA_ENTRY: true, CREDIT_BUREAU: true, APPROVAL: true },
      (id) => handler("CREDIT_BUREAU").skipFor(id),
    );
    await drainProcessJobs(app, db.owner);

    expect((await latestSteps(db.owner, processId)).get("CREDIT_BUREAU")).toMatchObject({
      status: "SKIPPED",
      skip_reason: "CONDITION_NOT_MET",
    });
    expect(handler("CREDIT_BUREAU").contexts.some((ctx) => ctx.applicationId === applicationId)).toBe(false);
  });

  it("runs each enabled step once in standard order and finishes with the last step's status", async () => {
    const { applicationId, processId } = await submitted({
      DATA_ENTRY: true,
      DEDUP: true,
      DUKCAPIL: true,
      APPROVAL: true,
    });
    await drainProcessJobs(app, db.owner);

    const steps = await latestSteps(db.owner, processId);
    expect(steps.get("DEDUP")).toMatchObject({ status: "COMPLETED", outcome_code: "PASSED", attempt: 1 });
    expect(steps.get("APPROVAL")).toMatchObject({ status: "COMPLETED", outcome_code: "APPROVED" });
    expect(steps.get("WAIT_CORE")?.status).toBe("PENDING");
    expect(await processStatus(db.owner, processId)).toBe("COMPLETED");
    expect(await applicationState(db.owner, applicationId)).toMatchObject({
      status: "APPROVED",
      current_step: "APPROVAL",
    });
  });

  it("passes the idempotency key of process, step, and attempt to the handler (COM-03)", async () => {
    const { applicationId, processId } = await submitted({ DATA_ENTRY: true, DEDUP: true, APPROVAL: true });
    await drainProcessJobs(app, db.owner);

    const ctx = handler("DEDUP").contexts.find((context) => context.applicationId === applicationId);
    expect(ctx).toMatchObject({ idempotencyKey: `${processId}:DEDUP:1`, tenantId: seedCompanyIds.company001 });
  });

  it("ignores duplicate advance jobs so a step never runs twice", async () => {
    const { applicationId, processId } = await submitted({ DATA_ENTRY: true, DEDUP: true, APPROVAL: true });
    await db.owner.query(
      `insert into pgboss.job (name, data) select name, data from pgboss.job
        where name = $1 and data->>'processInstanceId' = $2`,
      [ADVANCE_QUEUE, processId],
    );
    await drainProcessJobs(app, db.owner);

    expect(handler("DEDUP").contexts.filter((ctx) => ctx.applicationId === applicationId)).toHaveLength(1);
    expect(await processStatus(db.owner, processId)).toBe("COMPLETED");
  });

  it("retries a temporary error automatically with a new attempt (ER-03)", async () => {
    const { applicationId, processId } = await submitted({ DATA_ENTRY: true, DUKCAPIL: true, APPROVAL: true }, (id) =>
      handler("DUKCAPIL").script(id, TIMEOUT),
    );
    await drainProcessJobs(app, db.owner);
    expect((await latestSteps(db.owner, processId)).get("DUKCAPIL")).toMatchObject({ status: "ERROR", attempt: 1 });
    expect(await processStatus(db.owner, processId)).toBe("RUNNING");

    await drainProcessJobs(app, db.owner, { includeDelayed: true });

    expect((await latestSteps(db.owner, processId)).get("DUKCAPIL")).toMatchObject({ status: "COMPLETED", attempt: 2 });
    const keys = handler("DUKCAPIL").contexts.filter((ctx) => ctx.applicationId === applicationId);
    expect(keys.map((ctx) => ctx.idempotencyKey)).toEqual([`${processId}:DUKCAPIL:1`, `${processId}:DUKCAPIL:2`]);
  });

  it("stops at ERROR after three automatic retries (ER-03)", async () => {
    const { applicationId, processId } = await submitted({ DATA_ENTRY: true, DUKCAPIL: true, APPROVAL: true }, (id) =>
      handler("DUKCAPIL").script(id, TIMEOUT, TIMEOUT, TIMEOUT, TIMEOUT),
    );
    await drainProcessJobs(app, db.owner, { includeDelayed: true });

    expect((await latestSteps(db.owner, processId)).get("DUKCAPIL")).toMatchObject({
      status: "ERROR",
      attempt: 4,
      error_category: "TIMEOUT",
      error_message: "Dukcapil service timeout",
    });
    expect(await processStatus(db.owner, processId)).toBe("WAITING");
    expect(await applicationState(db.owner, applicationId)).toMatchObject({
      status: "ON_PROGRESS",
      current_step: "DUKCAPIL",
    });
  });

  it("stops at ERROR without retry for a permanent error (IN-07)", async () => {
    const { processId } = await submitted({ DATA_ENTRY: true, DUKCAPIL: true, APPROVAL: true }, (id) =>
      handler("DUKCAPIL").script(id, {
        ...TIMEOUT,
        errorCategory: "AUTH",
        errorMessage: "Invalid credential",
        retryable: false,
      }),
    );
    await drainProcessJobs(app, db.owner, { includeDelayed: true });

    expect((await latestSteps(db.owner, processId)).get("DUKCAPIL")).toMatchObject({ status: "ERROR", attempt: 1 });
    expect(await processStatus(db.owner, processId)).toBe("WAITING");
  });

  it("stops at ERROR when a licensed step in the route has no handler installed", async () => {
    const { processId } = await submitted({ DATA_ENTRY: true, VERIFICATION: true, APPROVAL: true });
    await drainProcessJobs(app, db.owner, { includeDelayed: true });

    expect((await latestSteps(db.owner, processId)).get("VERIFICATION")).toMatchObject({
      status: "ERROR",
      error_category: "CONFIG",
      error_message: "No step handler is installed for VERIFICATION",
    });
    expect(await processStatus(db.owner, processId)).toBe("WAITING");
  });
});
