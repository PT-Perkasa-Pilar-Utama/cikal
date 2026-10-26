import { Decimal } from "decimal.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { approverRateRange, assertApproverRate } from "./approver-rate.js";

/** Perubahan struktur kredit oleh approver final (api-specs 16 §16.6 body `APPROVE`). */
export interface TermChanges {
  interestRate?: string;
  tenorApproved?: number;
  loanAmount?: string;
}

export interface ApprovedTermValues {
  interestRate?: Decimal;
  tenor?: number;
  loanAmount?: Decimal;
}

/** Pesan usulan engineering untuk batas plafon dan tenor (api-specs 16 §16.6). */
export const APPROVED_TERM_MESSAGES = {
  loanAmountAboveRequest: "Loan amount must not exceed the requested limit",
  tenorOutOfRange: (min: string, max: string) => `Tenor must be between ${min} and ${max} months`,
} as const;

const invalid = (field: string, message: string): DomainError =>
  DomainError.standard("VALIDATION_FAILED", undefined, [{ field, code: "VALIDATION_FAILED", message }]);

/**
 * Suku bunga dalam rentang Approver SubProduct (AC-97.05), tanpa rentang `ACTION_DENIED`; plafon tidak melebihi
 * `requestedLimit`; tenor dalam batas produk saat submit (PR-06).
 */
export function approvedTerms(
  changes: TermChanges,
  snapshot: Readonly<Record<string, string>>,
  requestedLimit: Decimal,
): ApprovedTermValues {
  const values: ApprovedTermValues = {};
  if (changes.interestRate !== undefined) {
    const range = approverRateRange(snapshot);
    if (!range) throw DomainError.standard("ACTION_DENIED");
    values.interestRate = new Decimal(changes.interestRate);
    assertApproverRate(values.interestRate, range);
  }
  if (changes.loanAmount !== undefined) {
    values.loanAmount = new Decimal(changes.loanAmount);
    if (values.loanAmount.greaterThan(requestedLimit) || values.loanAmount.lessThanOrEqualTo(0)) {
      throw invalid("loanAmount", APPROVED_TERM_MESSAGES.loanAmountAboveRequest);
    }
  }
  if (changes.tenorApproved !== undefined) {
    const { PRODUCT_MIN_TENOR: min = "1", PRODUCT_MAX_TENOR: max } = snapshot;
    if (max && (changes.tenorApproved < Number(min) || changes.tenorApproved > Number(max))) {
      throw invalid("tenorApproved", APPROVED_TERM_MESSAGES.tenorOutOfRange(min, max));
    }
    values.tenor = changes.tenorApproved;
  }
  return values;
}
