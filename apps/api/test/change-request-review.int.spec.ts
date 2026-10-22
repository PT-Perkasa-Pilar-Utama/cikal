import { changeRequestReviewResponseSchema, errorEnvelopeSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import {
  createRecordsTable,
  lastAudit,
  packageHandler,
  recordCount,
  recordHandler,
  registerHandlers,
  submitAs,
  TAKEN_MESSAGE,
  TAKEN_NAME,
} from "./support/change-request.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const CHECKER_IP = "10.10.1.25";
const alreadyProcessed = { code: "ALREADY_PROCESSED", message: "This submission has already been processed" };
const selfReview = { code: "SELF_REVIEW_NOT_ALLOWED", message: "You cannot review your own submission" };

/** Approve dan reject sisi Checker (api-specs 07 §7.4, §7.5). */
describe("POST /change-requests/{id}/approve and /reject", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;
  let otherChecker: TestSession;
  let admin: TestSession;
  let viewer: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    await createRecordsTable(db.owner);
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerHandlers(app, [
      recordHandler("DOCUMENT_CHECKLIST", "Document Checklist"),
      recordHandler("ROLE_ACCESS", "Role Access"),
      packageHandler("DECISION_MATRIX", "Decision Matrix"),
    ]);
    const menus = ["MST-CHECKLIST", "IAM-ROLE-ACCESS", "MST-DECISION"];
    const makerRole = await createRole(
      db.owner,
      "Maker Uji",
      menus.map((menuCode) => ({ menuCode, view: true, create: true, update: true })),
    );
    const checkerRole = await createRole(
      db.owner,
      "Checker Uji",
      menus.map((menuCode) => ({ menuCode, view: true, approve: true })),
    );
    const adminRole = await createRole(db.owner, "Admin Uji", [
      { menuCode: "IAM-ROLE-ACCESS", view: true, create: true, approve: true },
    ]);
    const viewerRole = await createRole(db.owner, "Viewer Uji", [{ menuCode: "MST-CHECKLIST", view: true }]);
    maker = await createSession(db.owner, { roleId: makerRole });
    checker = await createSession(db.owner, { roleId: checkerRole });
    otherChecker = await createSession(db.owner, { roleId: checkerRole });
    admin = await createSession(db.owner, { roleId: adminRole });
    viewer = await createSession(db.owner, { roleId: viewerRole });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const review = (session: TestSession, id: string, verb: "approve" | "reject", payload: object = {}) =>
    app.inject({
      method: "POST",
      url: `/api/v1/change-requests/${id}/${verb}`,
      headers: session.headers,
      payload,
      remoteAddress: CHECKER_IP,
    });
  const errorOf = (res: { json(): unknown }) => errorEnvelopeSchema.parse(res.json());
  const statusOf = async (id: string) =>
    (await db.owner.query<{ status: string }>("select status from cr.change_requests where id = $1", [id])).rows[0]
      ?.status;
  const newRecord = (name: string) =>
    submitAs(app, maker, { entityType: "DOCUMENT_CHECKLIST", entityId: null, oldData: null, newData: { name } });

  it("approves new data, applies it, and audits the checker with the IP (AC-12.01)", async () => {
    const { changeRequestId } = await newRecord("KPR Subsidi");
    const res = await review(checker, changeRequestId, "approve");
    expect(res.statusCode).toBe(200);
    const body = changeRequestReviewResponseSchema.parse(res.json());
    expect(body).toMatchObject({ data: { id: changeRequestId, status: "APPROVED" }, message: "Data approved" });
    const applied = await db.owner.query("select id from cr_test.records where name = 'KPR Subsidi'");
    expect(applied.rows).toEqual([{ id: body.data.entityId }]);
    expect(await lastAudit(db.owner, checker.userId, "APPROVE")).toMatchObject({
      role: "Checker Uji",
      module: "Document Checklist",
      record_id: body.data.entityId,
      description: "Approve change request",
      ip_address: CHECKER_IP,
    });
  });

  it("stores the checker comment in the audit trail", async () => {
    const { changeRequestId } = await newRecord("KPR Komentar");
    await review(checker, changeRequestId, "approve", { comment: "Sesuai memo direksi" });
    expect((await lastAudit(db.owner, checker.userId, "APPROVE"))?.description).toBe("Sesuai memo direksi");
  });

  it("rejects a change, leaves the active data unchanged, and audits it (AC-12.03)", async () => {
    const before = await recordCount(db.owner, "DOCUMENT_CHECKLIST");
    const { changeRequestId } = await newRecord("KTA Ditolak");
    const res = await review(checker, changeRequestId, "reject");
    expect(res.statusCode).toBe(200);
    expect(changeRequestReviewResponseSchema.parse(res.json())).toEqual({
      data: { id: changeRequestId, status: "REJECTED" },
      message: "Data rejected",
    });
    expect(await recordCount(db.owner, "DOCUMENT_CHECKLIST")).toBe(before);
    expect(await lastAudit(db.owner, checker.userId, "REJECT")).toMatchObject({
      module: "Document Checklist",
      ip_address: CHECKER_IP,
    });
  });

  it("refuses approve and reject by the maker of the request (AC-12.04)", async () => {
    const { changeRequestId } = await submitAs(app, admin, {
      entityType: "ROLE_ACCESS",
      entityId: null,
      oldData: null,
      newData: { name: "Credit Analyst" },
    });
    for (const verb of ["approve", "reject"] as const) {
      const res = await review(admin, changeRequestId, verb);
      expect(res.statusCode).toBe(403);
      expect(errorOf(res)).toMatchObject(selfReview);
    }
    expect(await statusOf(changeRequestId)).toBe("WAITING_APPROVAL");
  });

  it("enforces the maker-is-not-reviewer rule in the database too (AC-12.04)", async () => {
    const { changeRequestId } = await newRecord("KPR Check");
    await expect(
      db.owner.query("update cr.change_requests set reviewed_by = submitted_by where id = $1", [changeRequestId]),
    ).rejects.toThrow(/change_requests_self_review_check/);
  });

  it("processes two simultaneous approvals once (AC-12.05)", async () => {
    const before = await recordCount(db.owner, "DOCUMENT_CHECKLIST");
    const { changeRequestId } = await newRecord("KTA Bersamaan");
    const results = await Promise.all([
      review(checker, changeRequestId, "approve"),
      review(otherChecker, changeRequestId, "approve"),
    ]);
    expect(results.map((res) => res.statusCode).sort()).toEqual([200, 409]);
    const loser = results.find((res) => res.statusCode === 409);
    expect(loser && errorOf(loser)).toMatchObject(alreadyProcessed);
    expect(await recordCount(db.owner, "DOCUMENT_CHECKLIST")).toBe(before + 1);
  });

  it("refuses to reject a request that is already approved (AC-12.05)", async () => {
    const { changeRequestId } = await newRecord("KTA Selesai");
    await review(checker, changeRequestId, "approve");
    const res = await review(otherChecker, changeRequestId, "reject");
    expect(res.statusCode).toBe(409);
    expect(errorOf(res)).toMatchObject(alreadyProcessed);
  });

  it("applies all 50 rows of an import package at once (AC-12.07)", async () => {
    const items = Array.from({ length: 50 }, (_, index) => ({ name: `PARAM_${index + 1}` }));
    const { changeRequestId } = await submitAs(app, maker, {
      entityType: "DECISION_MATRIX",
      entityId: null,
      oldData: null,
      newData: { items },
      packageSize: items.length,
    });
    const res = await review(checker, changeRequestId, "approve");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: { status: "APPROVED", entityId: null }, message: "Data approved" });
    expect(await recordCount(db.owner, "DECISION_MATRIX")).toBe(50);
  });

  it("applies none of an import package when one row fails (AC-12.07)", async () => {
    const before = await recordCount(db.owner, "DECISION_MATRIX");
    const items = [...Array.from({ length: 49 }, (_, index) => ({ name: `ROW_${index + 1}` })), { name: "invalid" }];
    const { changeRequestId } = await submitAs(app, maker, {
      entityType: "DECISION_MATRIX",
      entityId: null,
      oldData: null,
      newData: { items },
      packageSize: items.length,
    });
    const res = await review(checker, changeRequestId, "approve");
    expect(res.statusCode).toBe(422);
    expect(errorOf(res)).toMatchObject({ code: "BUSINESS_RULE_VIOLATION", message: "Row 50: Value is required" });
    expect(await recordCount(db.owner, "DECISION_MATRIX")).toBe(before);
    expect(await statusOf(changeRequestId)).toBe("WAITING_APPROVAL");
  });

  it("re-validates the entity rules against current data before applying", async () => {
    const { changeRequestId } = await newRecord(TAKEN_NAME);
    const res = await review(checker, changeRequestId, "approve");
    expect(res.statusCode).toBe(422);
    expect(errorOf(res)).toMatchObject({ code: "BUSINESS_RULE_VIOLATION", message: TAKEN_MESSAGE });
    expect(await statusOf(changeRequestId)).toBe("WAITING_APPROVAL");
  });

  it("requires the Approve right on the entity menu", async () => {
    const { changeRequestId } = await newRecord("KTA Tanpa Hak");
    const res = await review(viewer, changeRequestId, "approve");
    expect(res.statusCode).toBe(403);
    expect(errorOf(res)).toMatchObject({
      code: "ACTION_DENIED",
      message: "You do not have permission to perform this action",
    });
  });

  it.each(["approve", "reject"] as const)("answers 404 to %s of an unknown request", async (verb) => {
    const res = await review(checker, "0192b6a4-ffff-7000-8000-000000000001", verb);
    expect(res.statusCode).toBe(404);
    expect(errorOf(res)).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });
});
