import { DomainError } from "../../../../platform/http/domain-error.js";

/** Pengajuan tidak ada di tenant sesi (api-specs 25 §25.1). */
export function applicationNotFound(): DomainError {
  return new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
}
