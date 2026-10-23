import { moduleNames, type StepCode, stepCodes, stepModules } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/**
 * Langkah yang boleh tampil di editor rute: urutan baku tanpa langkah modul tak berlisensi (AC-31.08, AC-100.03,
 * RT-04). Dipasang di `GET /products/{id}/route` pada kartu BE-S2-01.
 */
export function licensedRouteSteps(licensedModules: ReadonlySet<string>): StepCode[] {
  return stepCodes.filter((code) => licensedModules.has(stepModules[code]));
}

/**
 * Langkah modul tak berlisensi yang tetap dikirim ditolak `422 MODULE_NOT_LICENSED_STEP` (api-specs 08 §8.9
 * langkah 2; teks usulan engineering). Dipasang di `PUT /products/{id}/route` pada kartu BE-S2-01.
 */
export function assertRouteStepsLicensed(
  steps: readonly { stepCode: StepCode }[],
  licensedModules: ReadonlySet<string>,
): void {
  const unlicensed = steps.find((step) => !licensedModules.has(stepModules[step.stepCode]));
  if (!unlicensed) return;
  const moduleName = moduleNames[stepModules[unlicensed.stepCode]];
  throw new DomainError("MODULE_NOT_LICENSED_STEP", `Module ${moduleName} is not licensed`, 422);
}
