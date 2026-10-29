import {
  type CounterScope,
  counterScopeSchema,
  type DocumentType,
  type ResetPeriod,
  resetPeriodSchema,
} from "@cikal/contracts";
import type { SelectOption } from "../../components/ui/SelectField";
import type { FieldPresentation } from "../change-request/comparison";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = { SP3K: "SP3K", CONTRACT: "Contract" };

/** Pilihan "Reset Period", contoh "Monthly" (AC-102.01). */
export const RESET_PERIOD_LABELS: Record<ResetPeriod, string> = {
  NONE: "None",
  YEARLY: "Yearly",
  MONTHLY: "Monthly",
  DAILY: "Daily",
};

/** Pilihan "Counter Scope", contoh "Branch" (AC-102.01). */
export const COUNTER_SCOPE_LABELS: Record<CounterScope, string> = {
  COMPANY: "Company",
  BRANCH: "Branch",
  PRODUCT: "Product",
  BRANCH_PRODUCT: "Branch and Product",
};

const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>): SelectOption[] =>
  values.map((value) => ({ value, label: labels[value] }));

export const RESET_PERIOD_OPTIONS = toOptions(resetPeriodSchema.options, RESET_PERIOD_LABELS);
export const COUNTER_SCOPE_OPTIONS = toOptions(counterScopeSchema.options, COUNTER_SCOPE_LABELS);

/** "Pending Document Numbering" memakai nama field yang sama dengan halaman Document Numbering. */
export const NUMBER_FORMAT_PRESENTATION: FieldPresentation = {
  labels: {
    documentType: "Document Type",
    versionNumber: "Version",
    pattern: "Pattern",
    resetPeriod: "Reset Period",
    counterScope: "Counter Scope",
    effectiveFrom: "Effective From",
  },
  valueLabels: {
    documentType: DOCUMENT_TYPE_LABELS,
    resetPeriod: RESET_PERIOD_LABELS,
    counterScope: COUNTER_SCOPE_LABELS,
  },
  hidden: ["versionId"],
};
