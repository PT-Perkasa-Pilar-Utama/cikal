import { APPROVAL_MESSAGES } from "@cikal/contracts";
import { Decimal } from "decimal.js";
import { DomainError } from "../../../../platform/http/domain-error.js";

export interface RateRange {
  min: Decimal;
  max: Decimal;
}

/** Rentang suku bunga yang boleh diubah Approver dari SubProduct saat submit (grooming v2 R-19); kosong = tidak bisa. */
export function approverRateRange(snapshot: Readonly<Record<string, string>>): RateRange | null {
  const { PRODUCT_APPROVER_RATE_MIN: min, PRODUCT_APPROVER_RATE_MAX: max } = snapshot;
  return min && max ? { min: new Decimal(min), max: new Decimal(max) } : null;
}

/** `422 RATE_OUT_OF_RANGE` di luar rentang inklusif (AC-97.05, api-specs 16 §16.6 langkah 6). */
export function assertApproverRate(rate: Decimal, range: RateRange): void {
  if (rate.greaterThanOrEqualTo(range.min) && rate.lessThanOrEqualTo(range.max)) return;
  const message = APPROVAL_MESSAGES.rateOutOfRange(range.min.toString(), range.max.toString());
  throw new DomainError("RATE_OUT_OF_RANGE", message, 422, [
    { field: "interestRate", code: "RATE_OUT_OF_RANGE", message },
  ]);
}
