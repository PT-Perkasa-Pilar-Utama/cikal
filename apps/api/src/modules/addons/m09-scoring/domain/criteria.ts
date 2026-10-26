import { Decimal } from "decimal.js";
import { isNumericType, type ScoringVariable, variableOf } from "./scoring-variables.js";

export type Operator = "EQ" | "NE" | "GT" | "GE" | "LT" | "LE" | "BETWEEN" | "IN";
export type CriterionType = "WEIGHTED" | "MANDATORY";

/** Nilai kriteria (api-specs 22 §22.3): satu nilai, daftar untuk `IN`, rentang untuk `BETWEEN`, atau variabel lain. */
export type CriterionValue =
  | { type: "LITERAL"; value: string }
  | { type: "LITERAL"; values: string[] }
  | { type: "LITERAL"; from: string; to: string }
  | { type: "VARIABLE"; variableCode: string };

export interface Criterion {
  id: string;
  fieldCode: string;
  operator: Operator;
  value: CriterionValue;
  weight: string | null;
  criterionType: CriterionType;
}

export interface CriterionEvaluation {
  criterionId: string;
  displayText: string;
  actualValue: string | null;
  isMet: boolean;
  /** Bobot yang ditambahkan ke skor; `0.00` untuk kriteria berbobot yang tidak terpenuhi, kosong untuk MANDATORY. */
  appliedWeight: string | null;
  /** Alasan kriteria MANDATORY yang gagal dengan nilai aktual dan batasnya (AC-67.02). */
  failedReason: string | null;
}

/** Nilai variabel pengajuan sebagai string desimal atau kode pilihan; kosong bila datanya tidak ada. */
export type VariableValues = Readonly<Record<string, string | null>>;
/** Label kode pilihan General Parameter, contoh `OCCUPATION` "001" = "Karyawan Swasta". */
export type ChoiceLabel = (fieldCode: string, code: string) => string;

const WEIGHT_DECIMALS = 2;
const OPERATOR_TEXT: Record<Operator, string> = {
  EQ: "is",
  NE: "is not",
  GT: ">",
  GE: ">=",
  LT: "<",
  LE: "<=",
  BETWEEN: "is between",
  IN: "is one of",
};

const isNumeric = (variable: ScoringVariable) => isNumericType(variable.dataType);

function compare(variable: ScoringVariable, operator: Operator, actual: string, expected: string): boolean {
  if (!isNumeric(variable)) {
    if (operator === "EQ") return actual === expected;
    if (operator === "NE") return actual !== expected;
    return false;
  }
  const cmp = new Decimal(actual).cmp(expected);
  const results: Record<Exclude<Operator, "BETWEEN" | "IN">, boolean> = {
    EQ: cmp === 0,
    NE: cmp !== 0,
    GT: cmp > 0,
    GE: cmp >= 0,
    LT: cmp < 0,
    LE: cmp <= 0,
  };
  return operator === "BETWEEN" || operator === "IN" ? false : results[operator];
}

function isMet(criterion: Criterion, variable: ScoringVariable, actual: string, values: VariableValues): boolean {
  const { value, operator } = criterion;
  if (value.type === "VARIABLE") {
    const expected = values[value.variableCode] ?? null;
    return expected !== null && compare(variable, operator, actual, expected);
  }
  if ("values" in value) return value.values.includes(actual);
  if ("from" in value) {
    return isNumeric(variable)
      ? new Decimal(actual).gte(value.from) && new Decimal(actual).lte(value.to)
      : actual >= value.from && actual <= value.to;
  }
  return compare(variable, operator, actual, value.value);
}

function expectedText(criterion: Criterion, choiceLabel: ChoiceLabel): string {
  const { value, fieldCode } = criterion;
  const shown = (code: string) => (isNumeric(variableOf(fieldCode)) ? code : choiceLabel(fieldCode, code));
  if (value.type === "VARIABLE") return variableOf(value.variableCode).label;
  if ("values" in value) return value.values.map(shown).join(", ");
  if ("from" in value) return `${shown(value.from)} and ${shown(value.to)}`;
  return shown(value.value);
}

/** Teks kriteria yang dibangun server, contoh "Occupation is one of ASN, Karyawan BUMN : +50" (AC-37.01). */
export function displayTextOf(criterion: Criterion, choiceLabel: ChoiceLabel): string {
  const base = `${variableOf(criterion.fieldCode).label} ${OPERATOR_TEXT[criterion.operator]} ${expectedText(criterion, choiceLabel)}`;
  if (criterion.criterionType !== "WEIGHTED" || criterion.weight === null) return base;
  const weight = new Decimal(criterion.weight);
  return `${base} : ${weight.isNegative() ? "" : "+"}${weight.toString()}`;
}

const shownNumber = (variable: ScoringVariable, value: string) =>
  variable.dataType === "PERCENT" ? `${new Decimal(value).toFixed(0, Decimal.ROUND_HALF_UP)}%` : value;

/** Alasan gagal, contoh "Installment to Income Ratio 332% exceeds DBR max 40%" (AC-67.02). */
function failedReasonOf(criterion: Criterion, actual: string | null, values: VariableValues, display: string): string {
  const variable = variableOf(criterion.fieldCode);
  const name = variable.reasonName ?? variable.label;
  if (actual === null) return `${name} is not available`;
  const { value, operator } = criterion;
  const limit =
    value.type === "VARIABLE" ? (values[value.variableCode] ?? null) : "value" in value ? value.value : null;
  if (limit === null || !isNumeric(variable) || !["LE", "LT", "GE", "GT"].includes(operator)) {
    return `${display} is not met`;
  }
  const limitVariable = value.type === "VARIABLE" ? variableOf(value.variableCode) : variable;
  const limitName = value.type === "VARIABLE" ? (limitVariable.reasonName ?? limitVariable.label) : "limit";
  const verb = operator === "LE" || operator === "LT" ? "exceeds" : "is below";
  return `${name} ${shownNumber(variable, actual)} ${verb} ${limitName} ${shownNumber(limitVariable, limit)}`;
}

/** Penilaian satu kriteria terhadap nilai pengajuan; nilai kosong tidak memenuhi kriteria apa pun. */
export function evaluateCriterion(
  criterion: Criterion,
  values: VariableValues,
  choiceLabel: ChoiceLabel,
): CriterionEvaluation {
  const variable = variableOf(criterion.fieldCode);
  const actual = values[criterion.fieldCode] ?? null;
  const met = actual !== null && isMet(criterion, variable, actual, values);
  const displayText = displayTextOf(criterion, choiceLabel);
  const weighted = criterion.criterionType === "WEIGHTED" && criterion.weight !== null;
  return {
    criterionId: criterion.id,
    displayText,
    actualValue: actual === null || isNumeric(variable) ? actual : choiceLabel(criterion.fieldCode, actual),
    isMet: met,
    appliedWeight: weighted ? new Decimal(met ? (criterion.weight ?? 0) : 0).toFixed(WEIGHT_DECIMALS) : null,
    failedReason:
      criterion.criterionType === "MANDATORY" && !met ? failedReasonOf(criterion, actual, values, displayText) : null,
  };
}
