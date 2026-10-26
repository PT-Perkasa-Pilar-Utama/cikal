import { APPROVAL_MESSAGES, type ApprovalAction, type ApprovalDecision } from "@cikal/contracts";

export interface ApprovalChainRow {
  sequence: number;
  jobLevel: number;
  subLevel: number;
  approverUserId: string;
  decision: ApprovalDecision;
}

/** Flag aksi Approval Level (technical-specs 06 §6.10). */
export interface LevelActions {
  isApprove: boolean;
  isReject: boolean;
  isReturn: boolean;
  isFinalApprover: boolean;
}

export interface ApprovalViewInput {
  chain: readonly ApprovalChainRow[];
  viewerId: string;
  submittedBy: string | null;
  /** Langkah APPROVAL masih `WAITING_HUMAN`; selain itu tidak ada keputusan yang bisa diambil. */
  waiting: boolean;
  actionsOf: (jobLevel: number) => LevelActions;
}

export interface ApprovalView {
  myRow: ApprovalChainRow | null;
  allowedActions: ApprovalAction[];
  blockedReason: string | null;
}

/**
 * `allowedActions` dan `blockedReason` api-specs 16 §16.5: penginput pengajuan tidak memutuskan (AC-72.05), level
 * atas menunggu level bawah (AC-72.03), dan aksi mengikuti flag level (AC-73.03).
 */
export function approvalView(input: ApprovalViewInput): ApprovalView {
  const mine = input.chain.filter((row) => row.approverUserId === input.viewerId);
  const myRow = mine.find((row) => row.decision === "PENDING") ?? mine.at(-1) ?? null;
  const none = { myRow, allowedActions: [], blockedReason: null };
  if (myRow?.decision !== "PENDING" || !input.waiting) return none;
  if (input.submittedBy === input.viewerId) {
    return { ...none, blockedReason: APPROVAL_MESSAGES.submitterCannotApprove };
  }
  const lower = input.chain.find((row) => row.sequence < myRow.sequence && row.decision === "PENDING");
  if (lower) return { ...none, blockedReason: APPROVAL_MESSAGES.waitingLowerLevel(lower.jobLevel) };
  const flags = input.actionsOf(myRow.jobLevel);
  const allowedActions: ApprovalAction[] = [];
  if (flags.isApprove) allowedActions.push("APPROVE");
  if (flags.isReject) allowedActions.push("REJECT");
  if (flags.isReturn) allowedActions.push("RETURN");
  return { myRow, allowedActions, blockedReason: null };
}
