import type { StepCode, StepStatus } from "@cikal/contracts";

/** Nilai langkah yang dilewati rute, lisensi, atau syarat (api-specs 24 §24.1, AC-69.03). */
export const SKIP_OUTCOME = "SKIP";

export interface OutcomeSource {
  stepCode: StepCode;
  status: StepStatus;
  outcomeCode: string | null;
}

/**
 * `outcomes(processId)` (technical-specs 12 §12.6): `outcomeCode` attempt terakhir langkah yang COMPLETED, atau
 * `SKIP` untuk langkah SKIPPED. Langkah yang belum selesai tidak ikut.
 */
export function stepOutcomes(latest: readonly OutcomeSource[]): Partial<Record<StepCode, string>> {
  const outcomes: Partial<Record<StepCode, string>> = {};
  for (const step of latest) {
    if (step.status === "SKIPPED") outcomes[step.stepCode] = SKIP_OUTCOME;
    else if (step.status === "COMPLETED" && step.outcomeCode) outcomes[step.stepCode] = step.outcomeCode;
  }
  return outcomes;
}
