import {
  type ApplicationInquirySortField,
  type ApplicationStatus,
  type StepCode,
  standardErrors,
  stepCodeSchema,
  stepNames,
} from "@cikal/contracts";

/** Saringan "Application Inquiry" yang sudah diterapkan dengan "Apply" (AC-83.02, AC-83.07). */
export interface InquiryFilter {
  state?: StepCode;
  status?: ApplicationStatus;
  submittedFrom?: string;
  submittedTo?: string;
}

export interface InquirySort {
  field: ApplicationInquirySortField;
  direction: "asc" | "desc";
}

export interface InquiryParams extends InquiryFilter {
  q: string;
  page: number;
  sort?: InquirySort;
}

export const STATE_OPTIONS = stepCodeSchema.options.map((code) => ({ value: code, label: stepNames[code] }));

export function inquirySearch(params: InquiryParams): URLSearchParams {
  const search = new URLSearchParams({ page: String(params.page) });
  if (params.q) search.set("q", params.q);
  for (const key of ["state", "status", "submittedFrom", "submittedTo"] as const) {
    const value = params[key];
    if (value) search.set(key, value);
  }
  if (params.sort) search.set("sort", `${params.sort.field},${params.sort.direction}`);
  return search;
}

/** Klik header: kolom baru diurutkan dari nilai terbesar atau terbaru, klik kedua membalik arah (AC-83.03). */
export function nextSort(current: InquirySort | undefined, field: ApplicationInquirySortField): InquirySort {
  if (current?.field !== field) return { field, direction: "desc" };
  return { field, direction: current.direction === "desc" ? "asc" : "desc" };
}

/** Pesan rentang "Submitted Date" sama dengan jawaban API `INVALID_DATE_RANGE` (AC-83.07). */
export function dateRangeError(filter: InquiryFilter): string | null {
  const { submittedFrom, submittedTo } = filter;
  return submittedFrom && submittedTo && submittedTo < submittedFrom ? standardErrors.INVALID_DATE_RANGE.message : null;
}
