import { DomainError } from "../../../../platform/http/domain-error.js";

/** Error data wilayah (api-specs 06 §6.3.3); teks usulan engineering. */
export const regionErrors = {
  syncInProgress: (): DomainError => new DomainError("SYNC_IN_PROGRESS", "Region sync is already running", 409),
};
