import * as c from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { SEED_USER_PASSWORD, startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession } from "./support/session.js";

/** Id sembarang: permintaan berikut ditolak skema sebelum data dibaca. */
const recordId = c.productIdMock;
const flags = { canView: true, canCreate: false, canUpdate: false, canDelete: false, canApprove: true };

const everyRight = { view: true, create: true, update: true, delete: true, approve: true };

/** Perilaku HTTP bersama: envelope error, validasi body, probe, metrik, dan rute reset (api-specs 01, 27). */
describe("HTTP platform", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let headers: Record<string, string>;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const roleId = await createRole(db.owner, "Platform Tester", [{ menuCode: "IAM-ROLE-ACCESS", ...everyRight }]);
    headers = (await createSession(db.owner, { roleId })).headers;
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("maps validation failures to the error envelope with field details", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/role-access",
      headers,
      payload: { menuId: recordId, ...flags },
    });
    expect(res.statusCode).toBe(400);
    const body = c.errorEnvelopeSchema.parse(res.json());
    expect(body).toMatchObject({ code: "VALIDATION_FAILED", message: "Please complete all required fields" });
    expect(body.details).toContainEqual(expect.objectContaining({ field: "roleId" }));
    expect(res.headers["x-correlation-id"]).toBe(body.correlationId);
  });

  it("rejects unknown fields in a request body", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/role-access/${recordId}`,
      headers,
      payload: { ...flags, x: 1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns the envelope for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/unknown", headers });
    expect(res.statusCode).toBe(404);
    expect(c.errorEnvelopeSchema.parse(res.json()).code).toBe("NOT_FOUND");
  });

  it("serves the public liveness probe", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health/live" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("serves Prometheus metrics to internal callers with request durations (api-specs 27 §27.3)", async () => {
    await app.inject({ method: "GET", url: "/api/health/live" });
    const res = await app.inject({ method: "GET", url: "/api/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toContain(
      'http_request_duration_seconds_count{method="GET",route="/api/health/live",status_code="200"}',
    );
  });

  it("rejects external metrics callers without the monitoring token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/metrics", remoteAddress: "203.0.113.5" });
    expect(res.statusCode).toBe(401);
  });

  it("does not register reset-state when the configuration does not allow it", async () => {
    const res = await app.inject({ method: "POST", url: "/api/admin/reset-state", payload: {} });
    expect(res.statusCode).toBe(404);
  });
});

describe("reset-state when enabled (api-specs 27 §27.4)", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let headers: Record<string, string>;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp({
      ...db.config,
      database: { ...db.config.database, migrationUrl: "postgres://owner@127.0.0.1:1/cikal" },
      resetApi: { token: "reset-test-token", defaultSeed: "qa", seedUserPassword: SEED_USER_PASSWORD },
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    headers = (await createSession(db.owner, { roleId: seedRoleIds.qa })).headers;
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("requires a QA session before the reset token is checked", async () => {
    const res = await app.inject({ method: "POST", url: "/api/admin/reset-state", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a missing or wrong reset token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/reset-state",
      headers: { ...headers, "x-reset-token": "wrong" },
    });
    expect(res.statusCode).toBe(403);
    expect(c.errorEnvelopeSchema.parse(res.json()).code).toBe("RESET_TOKEN_INVALID");
  });

  it("validates the seed before touching the database", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/reset-state",
      headers: { ...headers, "x-reset-token": "reset-test-token" },
      payload: { seed: "base" },
    });
    expect(res.statusCode).toBe(400);
    expect(c.errorEnvelopeSchema.parse(res.json()).code).toBe("VALIDATION_FAILED");
  });
});
