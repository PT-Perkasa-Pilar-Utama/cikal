import {
  changeRequestDetailResponseSchema,
  changeRequestListResponseSchema,
  errorEnvelopeSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { DomainError } from "../src/platform/http/domain-error.js";
import {
  createRecordsTable,
  lastAudit,
  packageHandler,
  recordHandler,
  registerHandlers,
  submitAs,
} from "./support/change-request.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

/** Halaman Pending dan detail (api-specs 07 §7.2, §7.3) serta pengajuan Maker (technical-specs 05 §5.6). */
describe("GET /change-requests and /change-requests/{id}", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;
  let admin: TestSession;
  let viewer: TestSession;
  let outsider: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    await createRecordsTable(db.owner);
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerHandlers(app, [
      recordHandler("SCORING_MODEL", "Scoring Model"),
      recordHandler("INTEGRATION_CONFIG", "Integration Config"),
      packageHandler("DOCUMENT_NUMBER_FORMAT", "Document Number Format"),
    ]);
    const menus = ["MST-SCORING", "MST-INTEGRATION", "MST-NUMBERING"];
    const makerRole = await createRole(
      db.owner,
      "Maker Uji",
      menus.map((menuCode) => ({ menuCode, view: true, update: true })),
    );
    const checkerRole = await createRole(
      db.owner,
      "Checker Uji",
      menus.map((menuCode) => ({ menuCode, view: true, approve: true })),
    );
    const adminRole = await createRole(db.owner, "Admin Uji", [
      { menuCode: "MST-INTEGRATION", view: true, create: true, approve: true },
    ]);
    maker = await createSession(db.owner, { roleId: makerRole });
    checker = await createSession(db.owner, { roleId: checkerRole });
    admin = await createSession(db.owner, { roleId: adminRole });
    viewer = await createSession(db.owner, {
      roleId: await createRole(db.owner, "Viewer Uji", [{ menuCode: "MST-SCORING", view: true }]),
    });
    outsider = await createSession(db.owner, { roleId: await createRole(db.owner, "Tanpa Hak", []) });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const get = (session: TestSession, url: string) =>
    app.inject({ method: "GET", url: `/api/v1/change-requests${url}`, headers: session.headers });
  const listOf = async (session: TestSession, query: string) => {
    const res = await get(session, `?${query}`);
    expect(res.statusCode, res.body).toBe(200);
    return changeRequestListResponseSchema.parse(res.json());
  };
  const detailOf = async (session: TestSession, id: string) => {
    const res = await get(session, `/${id}`);
    expect(res.statusCode, res.body).toBe(200);
    return changeRequestDetailResponseSchema.parse(res.json()).data;
  };
  const errorOf = (res: { json(): unknown }) => errorEnvelopeSchema.parse(res.json());
  const submitNew = (session: TestSession, entityType: "SCORING_MODEL" | "INTEGRATION_CONFIG", name: string) =>
    submitAs(app, session, { entityType, entityId: null, oldData: null, newData: { name } });
  const reject = (id: string) =>
    app.inject({ method: "POST", url: `/api/v1/change-requests/${id}/reject`, headers: checker.headers, payload: {} });

  it("lists new data waiting for approval on its Pending page with its maker (AC-12.01)", async () => {
    const { changeRequestId } = await submitNew(maker, "SCORING_MODEL", "KPR Subsidi");
    const { data } = await listOf(checker, "entityType=SCORING_MODEL");
    expect(data.find((row) => row.id === changeRequestId)).toMatchObject({
      action: "CREATE",
      displayName: "KPR Subsidi",
      packageSize: 1,
      status: "WAITING_APPROVAL",
      submittedBy: { id: maker.userId },
      canReview: true,
    });
    expect(await lastAudit(db.owner, maker.userId, "SUBMIT")).toMatchObject({
      module: "Scoring Model",
      record_id: changeRequestId,
    });
  });

  it("shows Current Data and Proposed Data with the changed field marked (AC-12.02)", async () => {
    const entityId = uuidv7();
    const { changeRequestId } = await submitAs(app, maker, {
      entityType: "SCORING_MODEL",
      entityId,
      oldData: { name: "KTA", limitAutoApproval: "10000000.00" },
      newData: { name: "KTA", limitAutoApproval: "15000000.00" },
    });
    expect(await detailOf(checker, changeRequestId)).toMatchObject({
      action: "UPDATE",
      entityId,
      currentData: { limitAutoApproval: "10000000.00" },
      proposedData: { limitAutoApproval: "15000000.00" },
      changedFields: ["limitAutoApproval"],
      canReview: true,
      reviewBlockedReason: null,
    });
  });

  it("drops a rejected change from the pending list (AC-12.03)", async () => {
    const { changeRequestId } = await submitNew(maker, "SCORING_MODEL", "KTA Ditolak");
    await reject(changeRequestId);
    const pending = await listOf(checker, "entityType=SCORING_MODEL");
    expect(pending.data.map((row) => row.id)).not.toContain(changeRequestId);
    const rejected = await listOf(checker, "entityType=SCORING_MODEL&status=REJECTED");
    expect(rejected.data.map((row) => row.id)).toContain(changeRequestId);
  });

  it("tells the maker they cannot review their own submission (AC-12.04)", async () => {
    const { changeRequestId } = await submitNew(admin, "INTEGRATION_CONFIG", "Credit Analyst");
    expect(await detailOf(admin, changeRequestId)).toMatchObject({
      canReview: false,
      reviewBlockedReason: "You cannot review your own submission",
    });
    const { data } = await listOf(admin, "entityType=INTEGRATION_CONFIG");
    expect(data.find((row) => row.id === changeRequestId)?.canReview).toBe(false);
  });

  it("refuses a second change while the data has a pending one (AC-12.06)", async () => {
    const entityId = uuidv7();
    const change = {
      entityType: "SCORING_MODEL",
      entityId,
      oldData: { name: "KTA" },
      newData: { name: "KTA 2" },
    } as const;
    await submitAs(app, maker, change);
    const second = submitAs(app, maker, { ...change, newData: { name: "KTA 3" } });
    await expect(second).rejects.toThrow(DomainError);
    await expect(second).rejects.toMatchObject({
      code: "PENDING_CHANGE_REQUEST",
      status: 409,
      message: "This data has a pending submission and cannot be edited",
    });
  });

  it("accepts a new change once the pending one is reviewed (AC-12.06)", async () => {
    const entityId = uuidv7();
    const change = {
      entityType: "SCORING_MODEL",
      entityId,
      oldData: { name: "KTA" },
      newData: { name: "KTA 2" },
    } as const;
    const first = await submitAs(app, maker, change);
    await reject(first.changeRequestId);
    await expect(submitAs(app, maker, change)).resolves.toMatchObject({ status: "WAITING_APPROVAL" });
  });

  it("shows an import package as one row with all its items (AC-12.07)", async () => {
    const items = Array.from({ length: 50 }, (_, index) => ({ name: `PARAM_${index + 1}` }));
    const { changeRequestId } = await submitAs(app, maker, {
      entityType: "DOCUMENT_NUMBER_FORMAT",
      entityId: null,
      oldData: null,
      newData: { items },
      packageSize: items.length,
    });
    const { data } = await listOf(checker, "entityType=DOCUMENT_NUMBER_FORMAT");
    expect(data).toEqual([expect.objectContaining({ id: changeRequestId, packageSize: 50 })]);
    expect((await detailOf(checker, changeRequestId)).proposedData).toEqual({ items });
  });

  it("pages and sorts by submission time", async () => {
    const first = await listOf(checker, "entityType=SCORING_MODEL&pageSize=1&sort=submittedAt,asc");
    const all = await listOf(checker, "entityType=SCORING_MODEL&sort=submittedAt,asc");
    expect(first.data).toEqual([all.data[0]]);
    expect(first.meta).toEqual({
      page: 1,
      pageSize: 1,
      totalItems: all.meta.totalItems,
      totalPages: all.meta.totalItems,
    });
  });

  it("hides the review action from a user without the Approve right", async () => {
    const { data } = await listOf(viewer, "entityType=SCORING_MODEL");
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((row) => !row.canReview)).toBe(true);
  });

  it("requires the View right on the entity menu", async () => {
    const res = await get(outsider, "?entityType=SCORING_MODEL");
    expect(res.statusCode).toBe(403);
    expect(errorOf(res)).toMatchObject({ code: "ACCESS_DENIED", message: "You do not have access to this page" });
  });

  it("requires the View right to open a request", async () => {
    const { data } = await listOf(checker, "entityType=SCORING_MODEL");
    const res = await get(outsider, `/${data[0]?.id}`);
    expect(res.statusCode).toBe(403);
    expect(errorOf(res)).toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("rejects entity types from different menus in one list", async () => {
    const res = await get(checker, "?entityType=SCORING_MODEL,INTEGRATION_CONFIG");
    expect(res.statusCode).toBe(400);
    expect(errorOf(res)).toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Please complete all required fields",
      details: [expect.objectContaining({ field: "entityType" })],
    });
  });

  it("rejects an unknown entity type", async () => {
    const res = await get(checker, "?entityType=PRODUK");
    expect(res.statusCode).toBe(400);
    expect(errorOf(res).code).toBe("VALIDATION_FAILED");
  });

  it("answers 404 for an unknown request", async () => {
    const res = await get(checker, "/0192b6a4-ffff-7000-8000-000000000001");
    expect(res.statusCode).toBe(404);
    expect(errorOf(res)).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });
});
