import type { ApplicationApprovalRow } from "../db/application-approvals.repository.js";
import type { ApprovalChainRow, LevelActions } from "../domain/approval-view.js";

export type ChainEntry = ApprovalChainRow & Omit<ApplicationApprovalRow, keyof ApprovalChainRow>;

/** Level tanpa baris Approval Level tidak punya aksi. */
export const NO_ACTIONS: LevelActions = { isApprove: false, isReject: false, isReturn: false, isFinalApprover: false };

/** Posisi rantai beserta approver-nya; baris AUTO_APPROVED tanpa level tidak termasuk rantai. */
export function chainOf(rows: readonly ApplicationApprovalRow[]): ChainEntry[] {
  return rows.flatMap(({ approverUserId, jobLevel, subLevel, ...row }) =>
    approverUserId && jobLevel !== null && subLevel !== null ? [{ ...row, approverUserId, jobLevel, subLevel }] : [],
  );
}
