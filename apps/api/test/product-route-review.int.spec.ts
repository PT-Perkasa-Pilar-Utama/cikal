import { changeRequestReviewResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { RouteActivation } from "../src/modules/core/product/application/route-activation.js";
import { ROUTE_ACTIVATION_QUEUE } from "../src/modules/core/product/jobs/queues.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertProduct } from "./support/product.js";
import {
  acceptedOf,
  expectError,
  KTA_VERSION_2,
  ktaWithVersion2,
  MANDATORY_STEPS,
  type RouteClient,
  routeClient,
  routeSessions,
  routeVersionId,
} from "./support/route.js";
import type { TestSession } from "./support/session.js";

const HOUR_MS = 60 * 60 * 1000;

/** Checker menyetujui atau menolak versi rute (api-specs 07 §7.4, §7.5; technical-specs 06 §6.13). */
describe("ChangeRequest ROUTE review", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let checker: TestSession;
  let api: RouteClient;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const sessions = await routeSessions(db.owner);
    checker = sessions.checker;
    api = routeClient(app, sessions);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-31.01 activates version 3 once a checker approves it and supersedes version 2", async () => {
    const productId = await ktaWithVersion2(db.owner);
    const { data } = acceptedOf(await api.propose(productId, { ...KTA_VERSION_2, CREDIT_BUREAU: false }));

    const approved = await api.review(data.changeRequestId, "approve");

    expect(approved.statusCode, approved.body).toBe(200);
    expect(changeRequestReviewResponseSchema.parse(approved.json()).data).toMatchObject({
      status: "APPROVED",
      entityId: productId,
      versionNumber: 3,
    });
    const route = await api.routeOf(productId);
    expect(route).toMatchObject({ versionNumber: 3, status: "ACTIVE", pendingVersionNumber: null });
    expect(route.steps.find((step) => step.stepCode === "CREDIT_BUREAU")).toMatchObject({ isEnabled: false });
    expect(await api.routeOf(productId, "?version=2")).toMatchObject({ status: "SUPERSEDED" });
  });

  it("returns a rejected version to Draft and accepts the next submission", async () => {
    const productId = await ktaWithVersion2(db.owner);
    const { data } = acceptedOf(await api.propose(productId, { ...KTA_VERSION_2, CREDIT_BUREAU: false }));

    expect((await api.review(data.changeRequestId, "reject")).statusCode).toBe(200);

    expect(await api.routeOf(productId, "?version=3")).toMatchObject({ status: "DRAFT" });
    expect(await api.routeOf(productId)).toMatchObject({ versionNumber: 2, pendingVersionNumber: null });
    expect(acceptedOf(await api.propose(productId, { ...KTA_VERSION_2, DEDUP: false })).data.versionNumber).toBe(4);
  });

  it("creates and activates the first route version of a product without a route", async () => {
    const productId = await insertProduct(db.owner);
    expectError(await api.send(checker, "GET", `/products/${productId}/route`), 404, "NOT_FOUND", "Route not found");

    const { data } = acceptedOf(await api.propose(productId, MANDATORY_STEPS));
    expect(data.versionNumber).toBe(1);
    expect(await api.routeOf(productId)).toMatchObject({ versionNumber: 1, status: "WAITING_APPROVAL" });
    expect((await api.review(data.changeRequestId, "approve")).statusCode).toBe(200);
    expect(await api.routeOf(productId)).toMatchObject({ versionNumber: 1, status: "ACTIVE" });
  });

  it("keeps an approved version waiting until its effective time, then activates it", async () => {
    const productId = await ktaWithVersion2(db.owner);
    const effectiveFrom = new Date(Date.now() + HOUR_MS).toISOString();
    const { data } = acceptedOf(await api.propose(productId, { ...KTA_VERSION_2, DEDUP: false }, { effectiveFrom }));

    expect((await api.review(data.changeRequestId, "approve")).statusCode).toBe(200);

    expect(await api.routeOf(productId)).toMatchObject({ versionNumber: 2, pendingVersionNumber: 3 });
    const versionId = await routeVersionId(db.owner, productId, 3);
    const { rows } = await db.owner.query<{ data: { tenantId: string }; start_after: Date }>(
      "select data, start_after from pgboss.job where name = $1 and data->>'versionId' = $2",
      [ROUTE_ACTIVATION_QUEUE, versionId],
    );
    expect(rows[0]?.start_after.toISOString()).toBe(effectiveFrom);
    await app.get(RouteActivation).activate(rows[0]?.data.tenantId ?? "", versionId);
    expect(await api.routeOf(productId)).toMatchObject({ versionNumber: 3, status: "ACTIVE", effectiveFrom });
    expect(await api.routeOf(productId, "?version=2")).toMatchObject({ status: "SUPERSEDED" });
  });
});
