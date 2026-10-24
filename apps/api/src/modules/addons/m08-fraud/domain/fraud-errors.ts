import { DomainError } from "../../../../platform/http/domain-error.js";

/** `404 APPLICATION_NOT_FOUND` (api-specs 21 §21.2). */
export function applicationNotFound(): DomainError {
  return new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
}

/** Review Fraud belum ada di POC; hasil Suspicious berhenti sebagai ERROR (kartu BE-S4-03). */
export const MANUAL_REVIEW_UNAVAILABLE = "Manual review is not available in POC";
