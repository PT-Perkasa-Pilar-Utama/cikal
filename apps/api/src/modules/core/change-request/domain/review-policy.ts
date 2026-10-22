import type { ChangeRequestStatus } from "@cikal/contracts";

/** Pesan sukses persis AC (AC-12.01, AC-12.03) dan body 202 checker-maker (api-specs 01 §1.8). */
export const CHANGE_REQUEST_MESSAGES = {
  submitted: "Data submitted for approval",
  approved: "Data approved",
  rejected: "Data rejected",
} as const;

export type ReviewBlock = "ALREADY_PROCESSED" | "SELF_REVIEW_NOT_ALLOWED";

/** Status dan pesan tiap penolakan tinjauan (api-specs 07 §7.4). */
export const REVIEW_BLOCKS: Record<ReviewBlock, { status: number; message: string }> = {
  ALREADY_PROCESSED: { status: 409, message: "This submission has already been processed" },
  SELF_REVIEW_NOT_ALLOWED: { status: 403, message: "You cannot review your own submission" },
};

export interface Reviewable {
  status: ChangeRequestStatus;
  submittedBy: string;
}

/**
 * Langkah 1 dan 2 api-specs 07 §7.4: hanya permintaan `WAITING_APPROVAL` yang bisa ditinjau (AC-12.05), dan
 * peninjau bukan pembuatnya (AC-12.04). `null` berarti boleh ditinjau.
 */
export function reviewBlock(request: Reviewable, reviewerId: string): ReviewBlock | null {
  if (request.status !== "WAITING_APPROVAL") return "ALREADY_PROCESSED";
  if (request.submittedBy === reviewerId) return "SELF_REVIEW_NOT_ALLOWED";
  return null;
}

/** Keterangan yang menggantikan tombol Approve, Reject, dan Revise di detail (api-specs 07 §7.3, AC-12.04). */
export function reviewBlockedReason(request: Reviewable, reviewerId: string): string | null {
  return reviewBlock(request, reviewerId) === "SELF_REVIEW_NOT_ALLOWED"
    ? REVIEW_BLOCKS.SELF_REVIEW_NOT_ALLOWED.message
    : null;
}
