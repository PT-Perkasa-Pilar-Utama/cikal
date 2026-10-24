import { type SkipReason, type StepCode, type StepStatus, stepCodes, stepModules } from "@cikal/contracts";

export interface RouteStepSetting {
  stepCode: StepCode;
  isEnabled: boolean;
}

export interface StepState {
  stepCode: StepCode;
  status: StepStatus;
}

const DONE: ReadonlySet<StepStatus> = new Set(["COMPLETED", "SKIPPED"]);

/**
 * Alasan langkah dilewati sebelum StepHandler dipanggil (technical-specs 12 §12.3), atau `null` bila langkah
 * dijalankan. Langkah yang dimatikan di rute: NOT_IN_ROUTE (AC-85.02). Modul tak berlisensi: NOT_LICENSED,
 * termasuk langkah yang tidak ada di versi rute karena editor tidak menampilkan modul tak berlisensi (AC-85.06,
 * slot NAME_SCREENING). Langkah berlisensi yang tidak ada di versi rute: NOT_IN_ROUTE.
 */
export function routeSkipReason(
  stepCode: StepCode,
  route: readonly RouteStepSetting[],
  licensedModules: ReadonlySet<string>,
): SkipReason | null {
  const setting = route.find((step) => step.stepCode === stepCode);
  if (setting && !setting.isEnabled) return "NOT_IN_ROUTE";
  if (!licensedModules.has(stepModules[stepCode])) return "NOT_LICENSED";
  return setting ? null : "NOT_IN_ROUTE";
}

/** Langkah pertama menurut urutan baku (tech ref 6.3) yang belum `COMPLETED` atau `SKIPPED`. */
export function currentStep<T extends StepState>(latest: readonly T[]): T | null {
  const byCode = new Map(latest.map((step) => [step.stepCode, step]));
  for (const code of stepCodes) {
    const step = byCode.get(code);
    if (step && !DONE.has(step.status)) return step;
  }
  return null;
}

/** Urutan tampil timeline (api-specs 13 §13.2). */
export function inStepOrder<T extends Pick<StepState, "stepCode">>(steps: readonly T[]): T[] {
  return [...steps].sort((a, b) => stepCodes.indexOf(a.stepCode) - stepCodes.indexOf(b.stepCode));
}

/** DUKCAPIL dilewati bila DEDUP selesai `MATCH`: pemohon sudah dikenal (technical-specs 12 §12.1, TRM_DDP_001). */
export function dedupMatchSkipReason(
  stepCode: StepCode,
  outcomes: Partial<Record<StepCode, string>>,
): SkipReason | null {
  return stepCode === "DUKCAPIL" && outcomes.DEDUP === "MATCH" ? "DEDUP_MATCH" : null;
}
