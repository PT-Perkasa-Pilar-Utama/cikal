import { changeRequestDetailResponseSchema, changeRequestListResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { ProductRoutes } from "../src/modules/core/product/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import {
  acceptedOf,
  expectError,
  KTA_VERSION_2,
  ktaWithVersion2,
  MANDATORY_STEPS,
  type RouteClient,
  routeClient,
  routeSessions,
  routeSettings,
} from "./support/route.js";
import type { TestSession } from "./support/session.js";

const UNKNOWN_ID = "0192b6a5-ffff-7000-8000-000000000001";

/** Maker mengajukan versi rute dan editor membaca rute (api-specs 08 §8.9, §8.10). */
describe("/products/{id}/route", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;
  let api: RouteClient;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    ({ maker, checker } = await routeSessions(db.owner));
    api = routeClient(app, { maker, checker });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const activeVersionNumber = (productId: string) =>
    app
      .get(TenantTx)
      .withTenantTx({ tenantId: seedCompanyIds.company001, userId: maker.userId }, (tx) =>
        app.get(ProductRoutes).activeRoute(tx, productId),
      )
      .then((route) => route?.versionNumber);

  it("AC-31.01 submits route version 3 and keeps new applications on version 2 until approval", async () => {
    const productId = await ktaWithVersion2(db.owner);

    const body = acceptedOf(await api.propose(productId, { ...KTA_VERSION_2, CREDIT_BUREAU: false }));

    expect(body).toMatchObject({
      data: { entityType: "ROUTE", entityId: productId, status: "WAITING_APPROVAL", versionNumber: 3 },
      message: "Route version 3 submitted for approval",
    });
    const pending = changeRequestListResponseSchema.parse(
      (await api.send(checker, "GET", "/change-requests?entityType=ROUTE")).json(),
    ).data;
    expect(pending.find((row) => row.id === body.data.changeRequestId)).toMatchObject({
      displayName: "Kredit Tanpa Agunan",
      status: "WAITING_APPROVAL",
    });
    expect(await api.routeOf(productId)).toMatchObject({ versionNumber: 2, status: "ACTIVE", pendingVersionNumber: 3 });
    expect(await api.routeOf(productId, "?version=3")).toMatchObject({ status: "WAITING_APPROVAL" });
    expect(await activeVersionNumber(productId)).toBe(2);
  });

  it("AC-31.01 shows the changed step on Pending Product Route", async () => {
    const productId = await ktaWithVersion2(db.owner);
    const { data } = acceptedOf(await api.propose(productId, { ...KTA_VERSION_2, CREDIT_BUREAU: false }));

    const res = await api.send(checker, "GET", `/change-requests/${data.changeRequestId}`);

    expect(changeRequestDetailResponseSchema.parse(res.json()).data).toMatchObject({
      changedFields: ["steps.CREDIT_BUREAU"],
      currentData: { versionNumber: 2 },
      proposedData: { versionNumber: 3 },
    });
  });

  it("AC-31.02 rejects turning the mandatory Approval module off", async () => {
    const productId = await ktaWithVersion2(db.owner);
    expectError(
      await api.propose(productId, { ...KTA_VERSION_2, APPROVAL: false }),
      422,
      "MANDATORY_STEP",
      "Approval is a mandatory module and cannot be turned off",
    );
  });

  it("AC-31.05 rejects a route without changes", async () => {
    const productId = await ktaWithVersion2(db.owner);
    expectError(await api.propose(productId, KTA_VERSION_2), 422, "NO_CHANGES", "No changes to submit");
  });

  it("AC-31.06 lets a user without Update view the route but not submit it", async () => {
    const productId = await ktaWithVersion2(db.owner);
    const route = await api.routeOf(productId);
    expect(route.steps[0]).toEqual({
      stepCode: "DATA_ENTRY",
      moduleCode: "CORE",
      order: 1,
      isEnabled: true,
      isMandatory: true,
      isConditional: false,
    });
    const res = await api.send(checker, "PUT", `/products/${productId}/route`, { steps: routeSettings(KTA_VERSION_2) });
    expect(res.statusCode).toBe(403);
  });

  it("AC-31.08 leaves unlicensed modules out of the editor and rejects them on submit", async () => {
    const productId = await ktaWithVersion2(db.owner);
    const codes = (await api.routeOf(productId)).steps.map((step) => step.stepCode);
    expect(codes).not.toContain("SURVEY");
    expect(codes).not.toContain("SIKP");
    expectError(
      await api.propose(productId, { ...KTA_VERSION_2, SIKP: true }),
      422,
      "MODULE_NOT_LICENSED_STEP",
      "Module SIKP is not licensed",
    );
  });

  it("refuses a second version while one is waiting for approval", async () => {
    const productId = await ktaWithVersion2(db.owner);
    acceptedOf(await api.propose(productId, { ...KTA_VERSION_2, CREDIT_BUREAU: false }));
    expectError(
      await api.propose(productId, { ...KTA_VERSION_2, DEDUP: false }),
      409,
      "PENDING_CHANGE_REQUEST",
      "This data has a pending submission and cannot be edited",
    );
  });

  it("answers 404 for the route of an unknown product or version", async () => {
    expectError(await api.send(checker, "GET", `/products/${UNKNOWN_ID}/route`), 404, "NOT_FOUND", "Route not found");
    expectError(await api.propose(UNKNOWN_ID, MANDATORY_STEPS), 404, "NOT_FOUND", "Data not found");
    const productId = await ktaWithVersion2(db.owner);
    expectError(
      await api.send(checker, "GET", `/products/${productId}/route?version=9`),
      404,
      "NOT_FOUND",
      "Route not found",
    );
  });

  it("rejects the same step twice in one request", async () => {
    const productId = await ktaWithVersion2(db.owner);
    const steps = [...routeSettings(KTA_VERSION_2), { stepCode: "DEDUP", isEnabled: false }];
    const res = await api.send(maker, "PUT", `/products/${productId}/route`, { steps });
    expect(res.statusCode).toBe(400);
  });
});
