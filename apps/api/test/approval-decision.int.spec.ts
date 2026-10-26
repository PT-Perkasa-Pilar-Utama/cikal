import { approvalDecisionResponseSchema, financingResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { approvalChain, openTasks } from "./support/approval.js";
import {
  type ApprovalActors,
  approvalActors,
  decide,
  expectError,
  waitingApproval,
} from "./support/approval-decision.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { applicationState, latestSteps } from "./support/process.js";

const APPROVE = { decision: "APPROVE", comment: "Agunan memadai" };

/** Keputusan Approve approver per level dan struktur kredit level final (api-specs 16 §16.6, US-72, US-97). */
describe("approval decision: approve", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let actors: ApprovalActors;

  const financingOf = async (applicationId: string) => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/financing`,
      headers: actors.inquirer.headers,
    });
    expect(res.statusCode).toBe(200);
    return financingResponseSchema.parse(res.json()).data;
  };
  /** Pengajuan 600.000.000 yang sudah disetujui level 2, menunggu level 1. */
  const atLevel1 = async () => {
    const waiting = await waitingApproval(app, db.owner, actors, "600000000.00");
    expect((await decide(app, actors.branchHead, waiting.applicationId, APPROVE)).statusCode).toBe(200);
    return waiting;
  };

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

  it("AC-72.02 forwards a level 2 approval to the level 1 queue and marks level 2 Approved", async () => {
    const { applicationId, processId } = await waitingApproval(app, db.owner, actors, "600000000.00");

    const res = await decide(app, actors.branchHead, applicationId, APPROVE);

    expect(res.statusCode).toBe(200);
    expect(approvalDecisionResponseSchema.parse(res.json())).toEqual({
      data: {
        decision: "APPROVE",
        jobLevel: 2,
        isFinal: false,
        applicationStatus: "ON_PROGRESS",
        nextStep: "APPROVAL",
      },
      message: "Loan application is successfully approved",
    });
    expect((await approvalChain(db.owner, processId)).map((row) => row.decision)).toEqual(["APPROVE", "PENDING"]);
    expect(await openTasks(db.owner, applicationId)).toMatchObject([
      { queue_code: "APPROVAL", status: "ASSIGNED", assigned_user_id: actors.regionalHead.userId },
    ]);
    expect((await latestSteps(db.owner, processId)).get("APPROVAL")).toMatchObject({ status: "WAITING_HUMAN" });
  });

  it("AC-72.01 approves at the final level and builds the schedule with the last outstanding at Rp0", async () => {
    const { applicationId, processId } = await atLevel1();

    const res = await decide(app, actors.regionalHead, applicationId, APPROVE);

    expect(res.statusCode).toBe(200);
    expect(approvalDecisionResponseSchema.parse(res.json())).toEqual({
      data: { decision: "APPROVE", jobLevel: 1, isFinal: true, applicationStatus: "APPROVED", nextStep: null },
      message: "Loan application is successfully approved",
    });
    expect((await latestSteps(db.owner, processId)).get("APPROVAL")).toMatchObject({
      status: "COMPLETED",
      outcome_code: "APPROVED",
      actor_user_id: actors.regionalHead.userId,
    });
    const financing = await financingOf(applicationId);
    expect(financing).toMatchObject({ loanAmount: "600000000.00", interestRate: "14.0000", approvalType: "MANUAL" });
    expect(financing.schedule.at(-1)?.outstandingAmount).toBe("0.00");
    expect(await openTasks(db.owner, applicationId)).toEqual([]);
  });

  it("AC-97.06 approves with 13% and records the rate change from 14% to 13%", async () => {
    const { applicationId } = await atLevel1();

    const res = await decide(app, actors.regionalHead, applicationId, {
      ...APPROVE,
      comment: "Nasabah payroll",
      interestRate: "13.0000",
    });

    expect(res.statusCode).toBe(200);
    expect(await financingOf(applicationId)).toMatchObject({ interestRate: "13.0000" });
    const { rows } = await db.owner.query(
      "select action, old_data, new_data from audit.audit_logs where record_id = $1 and module = 'Approval' order by id",
      [applicationId],
    );
    expect(rows.at(-1)).toEqual({
      action: "APPROVE",
      old_data: { interestRate: "14.0000" },
      new_data: { interestRate: "13.0000" },
    });
  });

  it("AC-97.05 rejects an interest rate outside the Approver range (RATE_OUT_OF_RANGE)", async () => {
    const { applicationId } = await atLevel1();

    const res = await decide(app, actors.regionalHead, applicationId, { ...APPROVE, interestRate: "16.0000" });

    expectError(res, 422, "RATE_OUT_OF_RANGE", "Interest rate must be between 11% and 15%");
  });

  it("rejects a loan amount above the requested limit (VALIDATION_FAILED)", async () => {
    const { applicationId } = await atLevel1();

    const res = await decide(app, actors.regionalHead, applicationId, { ...APPROVE, loanAmount: "600000001.00" });

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
  });

  it("AC-72.03 rejects level 1 before level 2 decides (WAITING_LOWER_LEVEL)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "600000000.00");

    expectError(
      await decide(app, actors.regionalHead, applicationId, APPROVE),
      409,
      "WAITING_LOWER_LEVEL",
      "Waiting for level 2 approval",
    );
  });

  it("AC-72.04 rejects Approve without a comment (COMMENT_REQUIRED)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00");

    expectError(
      await decide(app, actors.branchHead, applicationId, { decision: "APPROVE", comment: " " }),
      422,
      "COMMENT_REQUIRED",
      "Approval comments are required",
    );
  });

  it("AC-72.05 rejects the approver who submitted the application (SUBMITTER_CANNOT_APPROVE)", async () => {
    const { applicationId } = await waitingApproval(app, db.owner, actors, "100000000.00", {
      submittedBy: actors.branchHead.userId,
    });

    expectError(
      await decide(app, actors.branchHead, applicationId, APPROVE),
      403,
      "SUBMITTER_CANNOT_APPROVE",
      "You cannot approve an application you submitted",
    );
  });

  it("AC-72.07 processes two simultaneous approvals once (ALREADY_PROCESSED)", async () => {
    const { applicationId, processId } = await waitingApproval(app, db.owner, actors, "100000000.00");

    const responses = await Promise.all([
      decide(app, actors.branchHead, applicationId, APPROVE),
      decide(app, actors.branchHead, applicationId, APPROVE),
    ]);

    expect(responses.map((res) => res.statusCode).sort()).toEqual([200, 409]);
    const conflict = responses.find((res) => res.statusCode === 409);
    if (!conflict) throw new Error("conflict expected");
    expectError(conflict, 409, "ALREADY_PROCESSED", "This application has already been processed");
    expect(await approvalChain(db.owner, processId)).toMatchObject([{ decision: "APPROVE" }]);
    expect(await applicationState(db.owner, applicationId)).toMatchObject({ status: "APPROVED" });
  });
});
