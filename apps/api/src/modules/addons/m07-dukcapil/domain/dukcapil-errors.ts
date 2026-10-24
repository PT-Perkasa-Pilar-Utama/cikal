import { DomainError } from "../../../../platform/http/domain-error.js";

/** `404 APPLICATION_NOT_FOUND` (api-specs 20 §20.2). */
export function applicationNotFound(): DomainError {
  return new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
}

/** Pesan langkah setelah penyedia tidak menjawab dalam batas waktu (AC-61.02). */
export const DUKCAPIL_TIMEOUT = "Dukcapil service timeout";

/** Review Dukcapil belum ada di POC; hasil Review berhenti sebagai ERROR (kartu BE-S4-02). */
export const MANUAL_REVIEW_UNAVAILABLE = "Manual review is not available in POC";
