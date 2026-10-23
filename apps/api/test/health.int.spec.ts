import { readyResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { OpsSignals } from "../src/platform/ops/ops-signals.js";
import { installQueues } from "../src/platform/queue/install-queues.js";
import { testConfig } from "./support/test-config.js";

/** Probe asli terhadap PostgreSQL 17 (api-specs 27 §27.2). Storage sengaja tidak terjangkau: kritis, jadi `down`. */
describe("GET /api/health/ready", () => {
  let container: StartedPostgreSqlContainer;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    app = await createApp(
      testConfig({ database: { url: container.getConnectionUri(), migrationUrl: null, poolMax: 2 } }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it("reports the database up and the unreachable storage down with HTTP 503", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health/ready" });
    expect(res.statusCode).toBe(503);
    const body = readyResponseSchema.parse(res.json());
    expect(body.status).toBe("down");
    expect(body.dependencies.database.status).toBe("ok");
    expect(body.dependencies.objectStorage.status).toBe("down");
    expect(body.dependencies.queue?.status).toBe("down");
    expect(body.version).toBe("0.0.0-test");
  });

  it("reports pending and recently failed jobs once the queue schema is installed", async () => {
    const pool = new pg.Pool({ connectionString: container.getConnectionUri(), max: 1 });
    await installQueues(pool, [{ name: "health.probe" }], null);
    await pool.query("insert into pgboss.job (name, data) values ('health.probe', '{}')");
    await pool.end();
    app.get(OpsSignals).emit("reset_finished");

    const body = readyResponseSchema.parse((await app.inject({ method: "GET", url: "/api/health/ready" })).json());

    expect(body.dependencies.queue).toMatchObject({ status: "ok", pending: 1, failedLastHour: 0 });
  });

  it("rejects callers outside the internal network without the monitoring token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health/ready", remoteAddress: "203.0.113.5" });
    expect(res.statusCode).toBe(401);
  });

  it("accepts callers outside the internal network with the monitoring token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/health/ready",
      remoteAddress: "203.0.113.5",
      headers: { authorization: "Bearer monitoring-test-token" },
    });
    expect(res.statusCode).toBe(503);
  });
});
