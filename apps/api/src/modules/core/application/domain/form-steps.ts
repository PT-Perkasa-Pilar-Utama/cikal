import type { FormSection } from "@cikal/contracts";

/**
 * Urutan step form rilis POC (api-specs 12 §12.1). Section Spouse, Business, dan Collateral berstatus Backlog
 * (US-43, US-45, US-46), sehingga semua kombinasi produk, status kawin, dan pekerjaan memakai urutan yang sama.
 */
const POC_STEPS: readonly FormSection[] = ["application", "personal", "occupation", "documents", "emergency-contact"];

export function formSteps(): FormSection[] {
  return [...POC_STEPS];
}
