import { DomainError } from "../../../../platform/http/domain-error.js";

/** `404 APPLICATION_NOT_FOUND` (api-specs 19 §19.2). */
export function applicationNotFound(): DomainError {
  return new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
}

/** Review manual Dedup belum ada di POC; hasil Review dan Duplicate In-Flight berhenti sebagai ERROR (AC-59.02). */
export const MANUAL_REVIEW_UNAVAILABLE = "Manual review is not available in POC";
