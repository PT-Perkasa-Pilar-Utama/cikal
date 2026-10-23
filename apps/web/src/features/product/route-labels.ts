import {
  type ProductRouteResponse,
  type RouteVersionStatus,
  routeChangeDataSchema,
  type StepCode,
  stepCodes,
  stepNames,
} from "@cikal/contracts";
import { formatDateTime } from "../../lib/format";

export type RouteStep = ProductRouteResponse["data"]["steps"][number];

/** Status modul di daftar rute: aktif, bersyarat, atau mati (FE-S2-01; AC-31.04 untuk langkah bersyarat). */
export type StepState = "ACTIVE" | "CONDITIONAL" | "OFF";

export const STEP_STATE_LABELS: Record<StepState, string> = {
  ACTIVE: "Active",
  CONDITIONAL: "Conditional",
  OFF: "Off",
};

export function stepState(step: Pick<RouteStep, "isConditional">, isEnabled: boolean): StepState {
  if (!isEnabled) return "OFF";
  return step.isConditional ? "CONDITIONAL" : "ACTIVE";
}

/** Status versi rute (technical-specs 06 §6.13); "Waiting Approval" mengikuti AC-31.01. */
export const ROUTE_VERSION_STATUS_LABELS: Record<RouteVersionStatus, string> = {
  DRAFT: "Draft",
  WAITING_APPROVAL: "Waiting Approval",
  ACTIVE: "Active",
  SUPERSEDED: "Superseded",
};

/** Keterangan toggle modul wajib, sama dengan pesan `MANDATORY_STEP` (AC-31.02, api-specs 08 §8.9). */
export const mandatoryStepMessage = (stepCode: StepCode): string =>
  `${stepNames[stepCode]} is a mandatory module and cannot be turned off`;

const SWITCH_VALUES = { on: "On", off: "Off" } as const;

/** Label field ChangeRequest `ROUTE`; langkah memakai nama langkah dalam urutan baku tech ref 6.3. */
const ROUTE_FIELD_LABELS: Record<string, string> = {
  productCode: "Product Code",
  productName: "Product Name",
  versionNumber: "Version",
  effectiveFrom: "Effective From",
  ...Object.fromEntries(stepCodes.map((code) => [code, stepNames[code]])),
};

/**
 * Daftar langkah menjadi satu field per langkah, agar "Current Data" dan "Proposed Data" sejajar per modul dan
 * cocok dengan `changedFields` server seperti `steps.SURVEY` (api-specs 07 §7.3).
 */
function routeComparable(data: Record<string, unknown>): Record<string, unknown> {
  const parsed = routeChangeDataSchema.safeParse(data);
  if (!parsed.success) return data;
  const { productCode, productName, versionNumber, effectiveFrom, steps } = parsed.data;
  return {
    productCode,
    productName,
    versionNumber,
    effectiveFrom: effectiveFrom && formatDateTime(effectiveFrom),
    steps: Object.fromEntries(
      steps.map((step) => [step.stepCode, step.isEnabled ? SWITCH_VALUES.on : SWITCH_VALUES.off]),
    ),
  };
}

/** Penamaan data rute di layar "Pending Product Route". */
export const ROUTE_PRESENTATION = { labels: ROUTE_FIELD_LABELS, reshape: routeComparable };
