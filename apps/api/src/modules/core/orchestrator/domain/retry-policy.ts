import type { StepResult } from "@cikal/contracts";

/**
 * Jeda retry otomatis error sementara setelah attempt ke-1, ke-2, dan ke-3 (ER-03, technical-specs 12 §12.1).
 * Jumlahnya sama dengan `maxRetries` bawaan konfigurasi penyedia (data dictionary IntegrationConfig).
 */
const RETRY_DELAYS_SECONDS = [30, 120, 480] as const;

/** Jeda sebelum attempt berikutnya, atau `null` bila langkah berhenti di ERROR (IN-07). */
export function automaticRetryDelaySeconds(
  result: Extract<StepResult, { type: "ERROR" }>,
  attempt: number,
): number | null {
  if (!result.retryable) return null;
  return RETRY_DELAYS_SECONDS[attempt - 1] ?? null;
}
