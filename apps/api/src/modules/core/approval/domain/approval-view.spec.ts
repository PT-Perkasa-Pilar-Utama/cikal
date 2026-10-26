import { describe, expect, it } from "vitest";
import { type ApprovalChainRow, approvalView, type LevelActions } from "./approval-view.js";

const allActions: LevelActions = { isApprove: true, isReject: true, isReturn: true, isFinalApprover: false };
const row = (sequence: number, jobLevel: number, approverUserId: string): ApprovalChainRow => ({
  sequence,
  jobLevel,
  subLevel: 1,
  approverUserId,
  decision: "PENDING",
});
const chain = [row(1, 2, "kepala.cabang"), row(2, 1, "approver.01")];
const view = (viewerId: string, fields: Partial<Parameters<typeof approvalView>[0]> = {}) =>
  approvalView({ chain, viewerId, submittedBy: "sales", waiting: true, actionsOf: () => allActions, ...fields });

describe("approval detail actions", () => {
  it("lets the approver of the first pending level decide", () => {
    expect(view("kepala.cabang")).toMatchObject({
      allowedActions: ["APPROVE", "REJECT", "RETURN"],
      blockedReason: null,
    });
  });

  it("AC-72.03 blocks an upper level until the lower level decides", () => {
    expect(view("approver.01")).toMatchObject({
      myRow: { jobLevel: 1 },
      allowedActions: [],
      blockedReason: "Waiting for level 2 approval",
    });
  });

  it("AC-72.05 blocks the approver who submitted the application", () => {
    expect(view("kepala.cabang", { submittedBy: "kepala.cabang" })).toMatchObject({
      allowedActions: [],
      blockedReason: "You cannot approve an application you submitted",
    });
  });

  it("AC-73.03 leaves out Return when the level does not allow it", () => {
    const noReturn = view("kepala.cabang", { actionsOf: () => ({ ...allActions, isReturn: false }) });
    expect(noReturn.allowedActions).toEqual(["APPROVE", "REJECT"]);
  });

  it("gives no actions to a reader outside the chain", () => {
    expect(view("auditor")).toEqual({ myRow: null, allowedActions: [], blockedReason: null });
  });

  it("gives no actions once the step stopped waiting", () => {
    expect(view("kepala.cabang", { waiting: false })).toMatchObject({ allowedActions: [], blockedReason: null });
  });
});
