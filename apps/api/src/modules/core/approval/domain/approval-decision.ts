import {
  APPROVAL_COMMENT_MAX,
  APPROVAL_DECISION_MESSAGES,
  APPROVAL_MESSAGES,
  type ApprovalAction,
} from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ApprovalChainRow, ApprovalViewInput, LevelActions } from "./approval-view.js";

export interface DecisionCheck<T extends ApprovalChainRow = ApprovalChainRow> extends ApprovalViewInput {
  chain: readonly T[];
  decision: ApprovalAction;
  comment: string;
}

const ACTION_FLAG = {
  APPROVE: "isApprove",
  REJECT: "isReject",
  RETURN: "isReturn",
} as const satisfies Record<ApprovalAction, keyof LevelActions>;

const commentError = (code: string, message: string): DomainError =>
  new DomainError(code, message, 422, [{ field: "comment", code, message }]);

/**
 * Aturan keputusan api-specs 16 §16.6 langkah 1 s.d. 5, berurutan: posisi sudah diputuskan (AC-72.07), penginput
 * pengajuan (AC-72.05), level bawah belum memutuskan (AC-72.03), flag aksi level (AC-73.03), lalu komentar wajib
 * 1 s.d. 1.000 karakter (AC-72.04, AC-73.04, AC-73.05). Mengembalikan posisi rantai milik approver.
 */
export function decisionRow<T extends ApprovalChainRow>(input: DecisionCheck<T>): T {
  const mine = input.chain.filter((row) => row.approverUserId === input.viewerId);
  const pending = mine.find((row) => row.decision === "PENDING");
  if (mine.length === 0) {
    throw new DomainError("TASK_NOT_ASSIGNED_TO_YOU", "This task is assigned to another user", 403);
  }
  if (!pending || !input.waiting) {
    throw DomainError.standard("ALREADY_PROCESSED", APPROVAL_DECISION_MESSAGES.alreadyProcessed);
  }
  if (input.submittedBy === input.viewerId) {
    throw new DomainError("SUBMITTER_CANNOT_APPROVE", APPROVAL_MESSAGES.submitterCannotApprove, 403);
  }
  const lower = input.chain.find((row) => row.sequence < pending.sequence && row.decision === "PENDING");
  if (lower) {
    throw new DomainError("WAITING_LOWER_LEVEL", APPROVAL_MESSAGES.waitingLowerLevel(lower.jobLevel), 409);
  }
  if (!input.actionsOf(pending.jobLevel)[ACTION_FLAG[input.decision]]) throw DomainError.standard("ACTION_DENIED");
  const comment = input.comment.trim();
  if (comment.length === 0) throw commentError("COMMENT_REQUIRED", APPROVAL_DECISION_MESSAGES.commentRequired);
  if (comment.length > APPROVAL_COMMENT_MAX) {
    throw commentError("COMMENT_TOO_LONG", APPROVAL_DECISION_MESSAGES.commentTooLong);
  }
  return pending;
}
