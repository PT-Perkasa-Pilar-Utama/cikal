import { DomainError } from "../../../../platform/http/domain-error.js";

/** `YYYY-MM-DD` sehari sesudah `date`. */
function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Tanggal pencairan minimal H+1 dari tanggal bisnis hari ini, Asia/Jakarta (api-specs 25 §25.2 langkah 1, AC-76.02). */
export function assertDisbursementDate(disbursementDate: string, today: string): void {
  if (disbursementDate < nextDay(today)) {
    throw new DomainError("DISBURSEMENT_DATE_TOO_EARLY", "Disbursement date must be at least 1 day after today", 422);
  }
}
