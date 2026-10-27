import {
  APPROVAL_COMMENT_MAX,
  APPROVAL_DECISION_MESSAGES,
  APPROVAL_MESSAGES,
  type ApplicationApproval,
  type ApprovalAction,
  type ApprovalDecisionRequest,
} from "@cikal/contracts";
import { formatPercent, parsePercentInput } from "../../lib/format";

export interface DecisionInput {
  action: ApprovalAction;
  comment: string;
  /** Isi field "Interest Rate" apa adanya, contoh `"13"` atau `"12,5"`. */
  interestRate: string;
}

export type DecisionCheck = { request: ApprovalDecisionRequest } | { error: string };

/** Persen skala 4 (`"13.0000"`) sebagai bilangan bulat agar dibandingkan tanpa `number`. */
const scaled = (percent: string): bigint => BigInt(percent.replace(".", ""));

function rateError(approval: ApplicationApproval, rate: string | undefined): string | undefined {
  const { approverRateMin: min, approverRateMax: max } = approval;
  if (!min || !max) return undefined;
  if (rate && scaled(rate) >= scaled(min) && scaled(rate) <= scaled(max)) return undefined;
  return APPROVAL_MESSAGES.rateOutOfRange(formatPercent(min), formatPercent(max));
}

/**
 * Periksa keputusan sebelum konfirmasi "Yes": komentar wajib (AC-72.04, AC-73.04) dan paling banyak 1.000 karakter
 * (AC-73.05); "Interest Rate" Approve dalam rentang Approver (AC-97.05) dan hanya dikirim bila diubah (AC-97.06).
 * Server tetap memeriksa aturan yang sama.
 */
export function checkDecision(approval: ApplicationApproval, input: DecisionInput): DecisionCheck {
  const comment = input.comment.trim();
  if (!comment) return { error: APPROVAL_DECISION_MESSAGES.commentRequired };
  if (comment.length > APPROVAL_COMMENT_MAX) return { error: APPROVAL_DECISION_MESSAGES.commentTooLong };
  if (input.action !== "APPROVE" || !approval.rateEditable) return { request: { decision: input.action, comment } };
  const rate = parsePercentInput(input.interestRate);
  const error = rateError(approval, rate);
  if (error) return { error };
  const changed = rate && rate !== approval.interestRate;
  return { request: { decision: "APPROVE", comment, ...(changed && { interestRate: rate }) } };
}
