import { approvalDecisionResponseSchema, standardErrors } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { openTasks } from "./support/approval.js";
import {
  type ApprovalActors,
  approvalActors,
  decide,
  expectError,
  waitingApproval,
} from "./support/approval-decision.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { applicationState, latestSteps } from "./support/process.js";
import { createRole, createSession } from "./support/session.js";

/** Reject, Return, dan aturan bersama keputusan approver (api-specs 16 §16.6, US-73). */
describe("approval decision: reject and return", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let actors: ApprovalActors;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    actors = await approvalActors(db.owner);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-73.01 rejects the application, finishes it, and queues the rejection email", async () => {
    const { applicationId, processId } = await waitingApproval(app, db.owner, actors, "100000000.00");

    const res = await decide(app, actors.branchHead, applicationId, {
      decision: "REJECT",
      comment: "Penghasilan tidak terverifikasi",
    });

    expect(res.statusCode).toBe(200);
    expect(approvalDecisionResponseSchema.parse(res.json())).toEqual({
      data: { decision: "REJECT", jobLevel: 2, isFinal: true, applicationStatus: "FINISHED_REJECTED", nextStep: null },
      message: "Loan application has been rejected",
    });
    expect((await latestSteps(db.owner, processId)).get("APPROVAL")).toMatchObject({
      status: "COMPLETED",
      outcome_code: "REJECTED",
    });
    const { rows } = await db.owner.query(
      "select id from platform.outbox_events where aggregate_id = $1 and event_type = 'ApplicationRejected'",
      [applicationId],
    );
    expect(rows).toHaveLength(1);
  });

  it("AC-73.02 returns the application to Sales as Draft with the approver comment", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00");
    const comment = "Lengkapi rekening koran bulan September";

    const res = await decide(app, actors.branchHead, applicationId, { decision: "RETURN", comment });

    expect(res.statusCode).toBe(200);
    expect(approvalDecisionResponseSchema.parse(res.json())).toMatchObject({
      data: { decision: "RETURN", applicationStatus: "DRAFT", nextStep: null },
      message: "Application returned to sales",
    });
    expect(await applicationState(db.owner, applicationId)).toMatchObject({ status: "DRAFT", return_note: comment });
    expect(await openTasks(db.owner, applicationId)).toEqual([]);
  });

  it("AC-73.03 denies Return when the level does not allow it (ACTION_DENIED)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00", { isReturn: false });

    expectError(
      await decide(app, actors.branchHead, applicationId, { decision: "RETURN", comment: "Lengkapi dokumen" }),
      403,
      "ACTION_DENIED",
      standardErrors.ACTION_DENIED.message,
    );
  });

  it("AC-73.04 rejects Reject without a comment (COMMENT_REQUIRED)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00");

    expectError(
      await decide(app, actors.branchHead, applicationId, { decision: "REJECT" }),
      422,
      "COMMENT_REQUIRED",
      "Approval comments are required",
    );
  });

  it("AC-73.05 rejects a comment of 1.001 characters (COMMENT_TOO_LONG)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00");

    expectError(
      await decide(app, actors.branchHead, applicationId, { decision: "REJECT", comment: "a".repeat(1001) }),
      422,
      "COMMENT_TOO_LONG",
      "Approval comments must not exceed 1000 characters",
    );
  });

  it("rejects an approver outside the chain (TASK_NOT_ASSIGNED_TO_YOU)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00");
    const role = await createRole(db.owner, "Approver Lain", [{ menuCode: "OPS-APPROVAL", view: true, approve: true }]);
    const other = await createSession(db.owner, { roleId: role });

    expectError(
      await decide(app, other, applicationId, { decision: "REJECT", comment: "Tidak layak" }),
      403,
      "TASK_NOT_ASSIGNED_TO_YOU",
      "This task is assigned to another user",
    );
  });

  it("rejects a user without Approve on Approval (ACTION_DENIED)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00");

    expectError(
      await decide(app, actors.inquirer, applicationId, { decision: "REJECT", comment: "Tidak layak" }),
      403,
      "ACTION_DENIED",
      standardErrors.ACTION_DENIED.message,
    );
  });

  it("rejects an unknown application (APPLICATION_NOT_FOUND)", async () => {
    expectError(
      await decide(app, actors.branchHead, uuidv7(), { decision: "REJECT", comment: "Tidak layak" }),
      404,
      "APPLICATION_NOT_FOUND",
      "Application not found",
    );
  });

  it("requires an Idempotency-Key (IDEMPOTENCY_KEY_REQUIRED)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00");

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${applicationId}/approval/decision`,
      headers: actors.branchHead.headers,
      payload: { decision: "REJECT", comment: "Tidak layak" },
    });

    expectError(res, 400, "IDEMPOTENCY_KEY_REQUIRED", standardErrors.IDEMPOTENCY_KEY_REQUIRED.message);
  });
});
