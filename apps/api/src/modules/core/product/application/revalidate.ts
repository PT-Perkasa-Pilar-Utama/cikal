import { DomainError } from "../../../../platform/http/domain-error.js";

/**
 * Validasi ulang saat Checker menyetujui: aturan bisa berubah sejak diajukan, dan kegagalannya dijawab
 * `422 BUSINESS_RULE_VIOLATION` dengan pesan aturan itu (api-specs 07 §7.4 langkah 3).
 */
export async function revalidate(check: () => Promise<void>): Promise<void> {
  try {
    await check();
  } catch (error) {
    if (error instanceof DomainError) {
      throw new DomainError("BUSINESS_RULE_VIOLATION", error.message, 422, error.details);
    }
    throw error;
  }
}
