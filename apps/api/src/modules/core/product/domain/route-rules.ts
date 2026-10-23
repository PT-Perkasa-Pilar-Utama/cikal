import {
  type ProductRouteResponse,
  type RouteChangeData,
  type RouteStepSetting,
  type StepCode,
  stepCodes,
  stepModules,
  stepNames,
} from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { licensedRouteSteps } from "./route-licensing.js";

/** Langkah wajib (RT-03): Data Entry dan Approval, ditambah langkah M15 bila berlisensi (api-specs 08 §8.8). */
const MANDATORY_STEPS: ReadonlySet<StepCode> = new Set([
  "DATA_ENTRY",
  "APPROVAL",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
]);

/** Langkah yang tetap mengikuti kondisinya saat berjalan walau menyala di rute (RT-08, AC-31.04). */
const CONDITIONAL_STEPS: ReadonlySet<StepCode> = new Set(["SIKP"]);

export const ROUTE_NOT_FOUND = "Route not found";

export const noRouteChangesError = (): DomainError => new DomainError("NO_CHANGES", "No changes to submit", 422);

const enabledSteps = (steps: readonly RouteStepSetting[]) =>
  new Set(steps.filter((step) => step.isEnabled).map((step) => step.stepCode));

/**
 * Langkah wajib berlisensi yang dimatikan atau tidak dikirim ditolak `422 MANDATORY_STEP` (api-specs 08 §8.9
 * langkah 1). Langkah yang tidak dikirim tidak ikut versi, sehingga orchestrator akan melewatinya.
 */
export function assertMandatoryStepsEnabled(
  steps: readonly RouteStepSetting[],
  licensedModules: ReadonlySet<string>,
): void {
  const enabled = enabledSteps(steps);
  const off = licensedRouteSteps(licensedModules).find((code) => MANDATORY_STEPS.has(code) && !enabled.has(code));
  if (!off) return;
  throw new DomainError("MANDATORY_STEP", `${stepNames[off]} is a mandatory module and cannot be turned off`, 422);
}

/**
 * Langkah berlisensi yang menyala sama dengan versi ACTIVE (AC-31.05). Langkah yang tidak ada di versi dihitung
 * mati, dan langkah modul tak berlisensi tidak bisa diubah dari editor.
 */
export function sameRoute(
  proposed: readonly RouteStepSetting[],
  active: readonly RouteStepSetting[],
  licensedModules: ReadonlySet<string>,
): boolean {
  const before = enabledSteps(active);
  const after = enabledSteps(proposed);
  return licensedRouteSteps(licensedModules).every((code) => before.has(code) === after.has(code));
}

/** Path langkah yang berubah untuk "Pending Product Route", contoh `steps.SURVEY` (api-specs 07 §7.3). */
export function changedRouteSteps(
  current: readonly RouteStepSetting[] | null,
  proposed: readonly RouteStepSetting[],
): string[] {
  const before = enabledSteps(current ?? []);
  const after = enabledSteps(proposed);
  const codes = new Set([...(current ?? []), ...proposed].map((step) => step.stepCode));
  return stepCodes
    .filter((code) => codes.has(code) && (current === null || before.has(code) !== after.has(code)))
    .map((code) => `steps.${code}`);
}

/** Isi ChangeRequest `ROUTE`: langkah versi dalam urutan baku agar "Current Data" dan "Proposed Data" sejajar. */
export function toRouteChangeData(
  product: { productCode: string; productName: string },
  version: { id: string; versionNumber: number; effectiveFrom: Date | null },
  steps: readonly RouteStepSetting[],
): RouteChangeData {
  return {
    productCode: product.productCode,
    productName: product.productName,
    versionId: version.id,
    versionNumber: version.versionNumber,
    effectiveFrom: version.effectiveFrom?.toISOString() ?? null,
    steps: [...steps]
      .sort((a, b) => stepCodes.indexOf(a.stepCode) - stepCodes.indexOf(b.stepCode))
      .map(({ stepCode, isEnabled }) => ({ stepCode, isEnabled })),
  };
}

/** Isi editor rute: langkah modul berlisensi dalam urutan baku (api-specs 08 §8.10, AC-31.08). */
export function routeEditorSteps(
  steps: readonly RouteStepSetting[],
  licensedModules: ReadonlySet<string>,
): ProductRouteResponse["data"]["steps"] {
  const enabled = enabledSteps(steps);
  return licensedRouteSteps(licensedModules).map((code) => ({
    stepCode: code,
    moduleCode: stepModules[code],
    order: stepCodes.indexOf(code) + 1,
    isEnabled: enabled.has(code),
    isMandatory: MANDATORY_STEPS.has(code),
    isConditional: CONDITIONAL_STEPS.has(code),
  }));
}
