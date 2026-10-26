import { FINANCING_MESSAGES } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** `404 APPLICATION_NOT_FOUND` (api-specs 16 §16.5, §16.7). */
export function applicationNotFound(): DomainError {
  return new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
}

/** `404 NOT_FOUND` sebelum pengajuan disetujui (api-specs 16 §16.7). */
export function financingNotAvailable(): DomainError {
  return DomainError.standard("NOT_FOUND", FINANCING_MESSAGES.notAvailable);
}
