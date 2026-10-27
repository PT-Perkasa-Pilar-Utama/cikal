import {
  type ApplicationInquiryQuery,
  type ApplicationInquirySortField,
  applicationInquirySortFields,
} from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

const VISIBLE_DIGITS = 4;

/** NIK di daftar inquiry: 4 digit awal dan akhir, sisanya `*`, contoh `3273********0001` (api-specs 17 §17.1). */
export function maskIdCardNumber(idCardNumber: string): string {
  const hidden = Math.max(idCardNumber.length - VISIBLE_DIGITS * 2, 0);
  return `${idCardNumber.slice(0, VISIBLE_DIGITS)}${"*".repeat(hidden)}${idCardNumber.slice(VISIBLE_DIGITS + hidden)}`;
}

/** Rentang "Submitted Date" inklusif; tanggal akhir sebelum tanggal awal ditolak (AC-83.07). */
export function dateRangeError(
  query: Pick<ApplicationInquiryQuery, "submittedFrom" | "submittedTo">,
): DomainError | null {
  const { submittedFrom, submittedTo } = query;
  return submittedFrom && submittedTo && submittedTo < submittedFrom
    ? DomainError.standard("INVALID_DATE_RANGE")
    : null;
}

/** Kolom dan arah dari `sort`, contoh `modifiedAt,desc` (AC-83.03). */
export function inquirySort(sort: ApplicationInquiryQuery["sort"]): {
  field: ApplicationInquirySortField;
  direction: "asc" | "desc";
} {
  const field = applicationInquirySortFields.find((candidate) => sort.startsWith(`${candidate},`)) ?? "modifiedAt";
  return { field, direction: sort.endsWith(",asc") ? "asc" : "desc" };
}
