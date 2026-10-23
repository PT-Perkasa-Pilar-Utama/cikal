import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { Outbox, type OutboxEvent } from "../src/platform/queue/outbox.js";
import { OUTBOX_QUEUE } from "../src/platform/queue/outbox-queues.js";
import { startDatabase, type TestDatabase } from "./support/database.js";

const ACTOR = { tenantId: seedCompanyIds.company001, userId: "0192b6e0-0001-7000-8000-000000000001" };
const AGGREGATE_ID = "0192b6e0-0001-7000-8000-000000000002";

/** Outbox platform (technical-specs 05 §5.0.1 `publish`, XM-04): ditulis di transaksi aksi, dikirim worker. */
describe("outbox", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  const received: OutboxEvent[] = [];
  let failNext = false;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    app.get(Outbox).on("TestHappened", async (_tx, event) => {
      if (failNext) {
        failNext = false;
        throw new Error("handler failed");
      }
      received.push(event);
    });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const publish = (eventType: string) =>
    app
      .get(TenantTx)
      .withTenantTx(ACTOR, (tx) =>
        app
          .get(Outbox)
          .publish(tx, { tenantId: ACTOR.tenantId, eventType, aggregateId: AGGREGATE_ID, payload: { n: 1 } }),
      );
  const eventRow = async (id: string) =>
    (
      await db.owner.query<{ published_at: Date | null; attempts: number }>(
        "select published_at, attempts from platform.outbox_events where id = $1",
        [id],
      )
    ).rows[0];
  const jobData = async (id: string) =>
    (
      await db.owner.query<{ data: { tenantId: string; eventId: string } }>(
        "select data from pgboss.job where name = $1 and data->>'eventId' = $2",
        [OUTBOX_QUEUE, id],
      )
    ).rows[0]?.data;

  it("writes the event and its dispatch job, then hands it to the handler once", async () => {
    const id = await publish("TestHappened");
    const job = await jobData(id);
    expect(job).toEqual({ tenantId: ACTOR.tenantId, eventId: id });
    if (!job) return;

    await app.get(Outbox).dispatch(job);
    await app.get(Outbox).dispatch(job);

    expect(received).toEqual([
      { tenantId: ACTOR.tenantId, eventType: "TestHappened", aggregateId: AGGREGATE_ID, payload: { n: 1 } },
    ]);
    expect(await eventRow(id)).toEqual({ published_at: expect.any(Date), attempts: 1 });
  });

  it("counts a failed attempt and rethrows for the pg-boss retry", async () => {
    const id = await publish("TestHappened");
    failNext = true;

    await expect(app.get(Outbox).dispatch({ tenantId: ACTOR.tenantId, eventId: id })).rejects.toThrow("handler failed");

    expect(await eventRow(id)).toEqual({ published_at: null, attempts: 1 });
  });

  it("marks an event without handlers as published", async () => {
    const id = await publish("NobodyListens");

    await app.get(Outbox).dispatch({ tenantId: ACTOR.tenantId, eventId: id });

    expect((await eventRow(id))?.published_at).toEqual(expect.any(Date));
  });
});
