import { describe, expect, it } from "vitest";
import { type DecisionCheck, decisionRow } from "./approval-decision.js";
import type { ApprovalChainRow, LevelActions } from "./approval-view.js";

const allActions: LevelActions = { isApprove: true, isReject: true, isReturn: true, isFinalApprover: false };
const row = (sequence: number, jobLevel: number, approverUserId: string, decision = "PENDING"): ApprovalChainRow => ({
  sequence,
  jobLevel,
  subLevel: 1,
  approverUserId,
  decision: decision === "PENDING" ? "PENDING" : "APPROVE",
});
const check =
  (fields: Partial<DecisionCheck> = {}) =>
  () =>
    decisionRow({
      chain: [row(1, 2, "kepala.cabang"), row(2, 1, "approver.01")],
      viewerId: "kepala.cabang",
      submittedBy: "sales",
      waiting: true,
      actionsOf: () => allActions,
      decision: "APPROVE",
      comment: "Agunan memadai",
      ...fields,
    });
const error = (code: string, status: number, message: string) => expect.objectContaining({ code, status, message });

describe("approval decision rules", () => {
  it("returns the pending row of the approver", () => {
    expect(check()()).toMatchObject({ sequence: 1, jobLevel: 2 });
  });

  it("AC-72.07 rejects a decision on a position that is already decided", () => {
    const decided = { chain: [row(1, 2, "kepala.cabang", "APPROVE")] };
    expect(check(decided)).toThrow(error("ALREADY_PROCESSED", 409, "This application has already been processed"));
    expect(check({ waiting: false })).toThrow(
      error("ALREADY_PROCESSED", 409, "This application has already been processed"),
    );
  });

  it("rejects a user outside the chain", () => {
    expect(check({ viewerId: "auditor" })).toThrow(
      error("TASK_NOT_ASSIGNED_TO_YOU", 403, "This task is assigned to another user"),
    );
  });

  it("AC-72.05 rejects the approver who submitted the application", () => {
    expect(check({ submittedBy: "kepala.cabang" })).toThrow(
      error("SUBMITTER_CANNOT_APPROVE", 403, "You cannot approve an application you submitted"),
    );
  });

  it("AC-72.03 rejects an upper level before the lower level decides", () => {
    expect(check({ viewerId: "approver.01" })).toThrow(
      error("WAITING_LOWER_LEVEL", 409, "Waiting for level 2 approval"),
    );
  });

  it("AC-73.03 rejects Return when the level does not allow it", () => {
    const noReturn = { decision: "RETURN" as const, actionsOf: () => ({ ...allActions, isReturn: false }) };
    expect(check(noReturn)).toThrow(error("ACTION_DENIED", 403, "You do not have permission to perform this action"));
  });

  it("AC-72.04 rejects Approve without a comment", () => {
    expect(check({ comment: "   " })).toThrow(error("COMMENT_REQUIRED", 422, "Approval comments are required"));
  });

  it("AC-73.04 rejects Reject without a comment", () => {
    expect(check({ decision: "REJECT", comment: "" })).toThrow(
      error("COMMENT_REQUIRED", 422, "Approval comments are required"),
    );
  });

  it("AC-73.05 rejects a comment of 1.001 characters and accepts 1.000", () => {
    expect(check({ decision: "REJECT", comment: "a".repeat(1001) })).toThrow(
      error("COMMENT_TOO_LONG", 422, "Approval comments must not exceed 1000 characters"),
    );
    expect(check({ decision: "REJECT", comment: "a".repeat(1000) })).not.toThrow();
  });
});
