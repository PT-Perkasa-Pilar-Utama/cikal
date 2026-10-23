import { describe, expect, it } from "vitest";
import { allowedActions, branchScope, isEligible, type TaskFacts, type TaskViewer } from "./task-rules.js";

const ROLE = "0192b6a2-0008-7000-8000-000000000001";
const BRANCH = "0192b6a9-0001-7000-8000-000000000001";
const OTHER_BRANCH = "0192b6a9-0002-7000-8000-000000000001";
const headOffice = { regionalId: null, branchId: null, subBranchId: null };

const viewer = (overrides: Partial<TaskViewer> = {}): TaskViewer => ({
  userId: "veri.02",
  roleId: ROLE,
  workUnit: headOffice,
  canView: true,
  canWork: true,
  isSupervisor: false,
  ...overrides,
});
const task = (overrides: Partial<TaskFacts> = {}): TaskFacts => ({
  queueCode: "VERIFICATION",
  status: "OPEN",
  branchId: BRANCH,
  eligibleRoleId: ROLE,
  assignedUserId: null,
  ...overrides,
});

describe("task rules", () => {
  it("AC-58.01 offers Assign to Me on an open task the user is eligible for", () => {
    expect(allowedActions(task(), viewer())).toEqual(["ASSIGN"]);
  });

  it("AC-58.01 offers Proceed and Release Me on the user's own task", () => {
    expect(allowedActions(task({ status: "ASSIGNED", assignedUserId: "veri.02" }), viewer())).toEqual([
      "RELEASE",
      "PROCEED",
    ]);
  });

  it("AC-58.02 AC-58.06 offers no Assign to Me, Proceed, or Release Me on another user's task", () => {
    expect(allowedActions(task({ status: "ASSIGNED", assignedUserId: "veri.01" }), viewer())).toEqual([]);
  });

  it("AC-58.05 offers Release to a Supervisor on another user's task in their branch", () => {
    const supervisor = viewer({ roleId: null, canWork: false, isSupervisor: true });
    expect(allowedActions(task({ status: "ASSIGNED", assignedUserId: "veri.01" }), supervisor)).toEqual([
      "RELEASE_OTHER",
    ]);
    const elsewhere = { ...supervisor, workUnit: { ...headOffice, branchId: OTHER_BRANCH } };
    expect(allowedActions(task({ status: "ASSIGNED", assignedUserId: "veri.01" }), elsewhere)).toEqual([]);
  });

  it("offers neither Assign to Me nor Release on a queue assigned per user (TQ-06)", () => {
    const approval = task({ queueCode: "APPROVAL", status: "ASSIGNED", assignedUserId: "veri.02" });
    expect(allowedActions(approval, viewer())).toEqual(["PROCEED"]);
    expect(allowedActions({ ...approval, assignedUserId: "veri.01" }, viewer({ isSupervisor: true }))).toEqual([]);
  });

  it("offers nothing without Update on the queue menu", () => {
    expect(allowedActions(task(), viewer({ canWork: false }))).toEqual([]);
  });

  it("requires the eligible role and a work unit that covers the task branch", () => {
    expect(isEligible(task(), viewer({ roleId: "0192b6a2-0009-7000-8000-000000000001" }))).toBe(false);
    expect(isEligible(task({ eligibleRoleId: null }), viewer({ roleId: null }))).toBe(true);
    expect(isEligible(task(), viewer({ workUnit: { ...headOffice, branchId: OTHER_BRANCH } }))).toBe(false);
    expect(isEligible(task({ branchId: null }), viewer({ workUnit: { ...headOffice, branchId: OTHER_BRANCH } }))).toBe(
      true,
    );
  });

  it("scopes head office to every branch and a branch user to their own branch and sub branch", () => {
    expect(branchScope(headOffice)).toBe("ALL");
    expect(branchScope({ regionalId: null, branchId: BRANCH, subBranchId: OTHER_BRANCH })).toEqual([
      BRANCH,
      OTHER_BRANCH,
    ]);
    expect(branchScope({ regionalId: BRANCH, branchId: null, subBranchId: null })).toEqual([]);
  });
});
