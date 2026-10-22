import { readyResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
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
    expect(body.version).toBe("0.0.0-test");
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
