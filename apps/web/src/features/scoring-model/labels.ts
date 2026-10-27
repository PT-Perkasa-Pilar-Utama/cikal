import {
  type CriterionOperator,
  type CriterionTypeCode,
  criterionOperatorSchema,
  type FormulaVariable,
  type ModelGroup,
  type ScoringModelStatus,
} from "@cikal/contracts";
import type { SelectOption } from "../../components/ui/SelectField";
import type { FieldPresentation } from "../change-request/comparison";

/** Teks operator di form kriteria, contoh "is one of" dan "less than or equal" (AC-37.01, AC-37.02). */
export const OPERATOR_LABELS: Record<CriterionOperator, string> = {
  EQ: "equal",
  NE: "not equal",
  GT: "greater than",
  GE: "greater than or equal",
  LT: "less than",
  LE: "less than or equal",
  BETWEEN: "between",
  IN: "is one of",
};

export const CRITERION_TYPE_LABELS: Record<CriterionTypeCode, string> = {
  WEIGHTED: "Weighted",
  MANDATORY: "Mandatory",
};

export const MODEL_GROUP_LABELS: Record<ModelGroup, string> = { SCORING: "Scoring", RAC: "RAC" };

export const MODEL_STATUS_LABELS: Record<ScoringModelStatus, string> = {
  DRAFT: "Draft",
  WAITING_APPROVAL: "Waiting Approval",
  ACTIVE: "Active",
  SUPERSEDED: "Superseded",
};

const NUMERIC_TYPES: ReadonlySet<FormulaVariable["dataType"]> = new Set(["NUMBER", "MONEY", "PERCENT"]);

const TEXT_OPERATORS: ReadonlySet<CriterionOperator> = new Set(["EQ", "NE", "IN"]);

export const isNumeric = (variable: FormulaVariable): boolean => NUMERIC_TYPES.has(variable.dataType);

/** Variabel bukan angka hanya memakai `EQ`, `NE`, dan `IN` (api-specs 22 §22.3). */
export function operatorOptions(variable: FormulaVariable | undefined): SelectOption[] {
  const operators = criterionOperatorSchema.options;
  const allowed = variable && !isNumeric(variable) ? operators.filter((op) => TEXT_OPERATORS.has(op)) : operators;
  return allowed.map((operator) => ({ value: operator, label: OPERATOR_LABELS[operator] }));
}

/** "Pending Scoring Model" memakai nama field yang sama dengan halaman Scoring Model. */
export const SCORING_MODEL_PRESENTATION: FieldPresentation = {
  labels: {
    modelCode: "Model Code",
    modelName: "Model Name",
    modelGroup: "Model Group",
    versionNumber: "Version",
    effectiveFrom: "Effective From",
    constant: "Constant",
    cutOff: "Cut Off",
    reviewLowerBound: "Review Lower Bound",
    criteria: "Criteria",
  },
  valueLabels: { modelGroup: MODEL_GROUP_LABELS },
  hidden: ["modelId", "productIds"],
};
