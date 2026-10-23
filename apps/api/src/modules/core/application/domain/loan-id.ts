import { businessDate } from "../../../../platform/clock/business-date.js";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** Counter 7 digit per produk per company; tidak direset harian (TRM_LID_003, TRM_LID_005). */
export const LOAN_ID_MAX_SEQUENCE = 9_999_999;
const SEQUENCE_DIGITS = 7;

/** Loan ID `ddMMyyyy` + kode produk + counter, tanggal Asia/Jakarta (api-specs 12 §12.2 langkah 4). */
export function formatLoanId(at: Date, productCode: string, sequence: number): string {
  const [year, month, day] = businessDate(at).split("-");
  return `${day}${month}${year}${productCode}${String(sequence).padStart(SEQUENCE_DIGITS, "0")}`;
}

/** Counter sudah 9.999.999 (TRM_LID_005). */
export const loanIdExhausted = (): DomainError =>
  new DomainError("LOAN_ID_EXHAUSTED", "Loan ID counter has reached its limit. Please contact your administrator", 422);
