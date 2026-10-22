import * as c from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { z } from "zod";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { SEED_USER_PASSWORD, startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession } from "./support/session.js";

const productId = c.productIdMock;
const stubRoleId = "0192b6a4-0001-7000-8000-000000000001";
const validProduct = {
  productCode: "KTA",
  productName: "Kredit Tanpa Agunan",
  productCategory: "NON_COLLATERAL",
  interestType: "EFFECTIVE",
  minPlafond: "5000000.00",
  maxPlafond: "300000000.00",
  minTenor: 6,
  maxTenor: 60,
  minAge: 21,
  maxAge: 55,
  dbrMax: "40.0000",
  validFrom: "2026-10-01",
};
const flags = { canView: true, canCreate: false, canUpdate: false, canDelete: false, canApprove: true };

type Case = [string, "GET" | "POST" | "PUT", string, unknown, number, z.ZodType];

/** Setiap stub Sprint 1 menjawab status dan body yang lolos skema kontrak (api-specs 03, 08). */
const cases: Case[] = [
  ["roles", "GET", "/api/v1/roles", undefined, 200, c.roleListResponseSchema],
  ["menus", "GET", "/api/v1/menus", undefined, 200, c.menuTreeResponseSchema],
  ["role access list", "GET", "/api/v1/role-access", undefined, 200, c.roleAccessListResponseSchema],
  [
    "role access create",
    "POST",
    "/api/v1/role-access",
    { roleId: stubRoleId, menuId: productId, ...flags },
    202,
    c.changeRequestAcceptedSchema,
  ],
  ["role access update", "PUT", `/api/v1/role-access/${productId}`, flags, 202, c.changeRequestAcceptedSchema],
  ["product list", "GET", "/api/v1/products", undefined, 200, c.productListResponseSchema],
  ["product detail", "GET", `/api/v1/products/${productId}`, undefined, 200, c.productDetailResponseSchema],
  ["product create", "POST", "/api/v1/products", validProduct, 202, c.changeRequestAcceptedSchema],
  [
    "product update",
    "PUT",
    `/api/v1/products/${productId}`,
    { ...validProduct, isActive: true },
    202,
    c.changeRequestAcceptedSchema,
  ],
  ["product pricing", "GET", `/api/v1/products/${productId}/pricing`, undefined, 200, c.productPricingResponseSchema],
  [
    "product pricing update",
    "PUT",
    `/api/v1/products/${productId}/pricing`,
    {
      adminFee: "250000.00",
      provisionFee: "1.0000",
      subProducts: [{ interestRate: "12.0000", validFrom: "2026-10-01" }],
    },
    202,
    c.changeRequestAcceptedSchema,
  ],
];

const everyRight = { view: true, create: true, update: true, delete: true, approve: true };

describe("Sprint 1 stubs", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let headers: Record<string, string>;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const roleId = await createRole(db.owner, "Stub Tester", [
      { menuCode: "MST-PRODUCT", ...everyRight },
      { menuCode: "IAM-ROLE-ACCESS", ...everyRight },
    ]);
    headers = (await createSession(db.owner, { roleId })).headers;
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it.each(cases)("%s returns a contract-valid response", async (_name, method, url, payload, status, schema) => {
    const res = await app.inject({
      method,
      url,
      headers,
      ...(payload === undefined ? {} : { payload: payload as object }),
    });
    expect(res.statusCode, res.body).toBe(status);
    const parsed = schema.safeParse(res.json());
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
  });

  it("maps validation failures to the error envelope with AC messages (AC-20.04)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers,
      payload: { ...validProduct, productCode: "KPRSUB" },
    });
    expect(res.statusCode).toBe(400);
    const body = c.errorEnvelopeSchema.parse(res.json());
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.details).toContainEqual(
      expect.objectContaining({ field: "productCode", message: "Product code must be 1 to 5 letters or digits" }),
    );
    expect(res.headers["x-correlation-id"]).toBe(body.correlationId);
  });

  it("rejects unknown fields in a request body", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/role-access/${productId}`,
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
