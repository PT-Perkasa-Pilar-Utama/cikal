import { type CriterionInput, SCORING_MODEL_MESSAGES } from "@cikal/contracts";
import { Decimal } from "decimal.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { Criterion, CriterionValue, Operator } from "./criteria.js";
import { isNumericType, type ScoringVariable } from "./scoring-variables.js";

/** Variabel yang boleh dipakai kriteria tenant ini: ada di katalog, `usableInScoring`, dan modulnya berlisensi. */
export type VariableLookup = (code: string) => ScoringVariable | null;
/** Kode pilihan aktif satu variabel CHOICE, contoh "001" s.d. "005" untuk Occupation. */
export type ChoiceOptions = (fieldCode: string) => ReadonlySet<string>;

const WEIGHT_LIMIT = 1000;
const WEIGHT_DECIMALS = 2;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
/** Operator untuk variabel bukan angka; perbandingan besar kecil hanya untuk angka. */
const TEXT_OPERATORS: ReadonlySet<Operator> = new Set(["EQ", "NE", "IN"]);

const invalidValue = (message: string): DomainError =>
  new DomainError("INVALID_CRITERION_VALUE", message, 422, [
    { field: "value", code: "INVALID_CRITERION_VALUE", message },
  ]);

function literalsOf(value: CriterionValue): string[] {
  if (value.type === "VARIABLE") return [];
  if ("values" in value) return value.values;
  if ("from" in value) return [value.from, value.to];
  return [value.value];
}

/** Bentuk nilai mengikuti operator: daftar untuk `IN`, rentang untuk `BETWEEN`, satu nilai atau variabel lainnya. */
function assertShape(operator: Operator, value: CriterionValue): void {
  const fits =
    operator === "IN"
      ? value.type === "LITERAL" && "values" in value
      : operator === "BETWEEN"
        ? value.type === "LITERAL" && "from" in value
        : value.type === "VARIABLE" || "value" in value;
  if (!fits || literalsOf(value).some((literal) => literal.trim() === "")) {
    throw invalidValue(SCORING_MODEL_MESSAGES.valueRequired);
  }
}

function normalized(value: CriterionValue): CriterionValue {
  if (value.type === "VARIABLE") return value;
  if ("values" in value) return { type: "LITERAL", values: value.values.map((item) => item.trim()) };
  if ("from" in value) return { type: "LITERAL", from: value.from.trim(), to: value.to.trim() };
  return { type: "LITERAL", value: value.value.trim() };
}

function weightOf(input: CriterionInput): string | null {
  if (input.criterionType === "MANDATORY") return null;
  if (input.weight === undefined || input.weight === null) {
    const message = SCORING_MODEL_MESSAGES.weightRequired;
    throw DomainError.standard("VALIDATION_FAILED", undefined, [
      { field: "weight", code: "VALIDATION_FAILED", message },
    ]);
  }
  const weight = new Decimal(input.weight);
  if (weight.abs().greaterThan(WEIGHT_LIMIT)) {
    const message = SCORING_MODEL_MESSAGES.weightOutOfRange;
    throw new DomainError("WEIGHT_OUT_OF_RANGE", message, 422, [
      { field: "weight", code: "WEIGHT_OUT_OF_RANGE", message },
    ]);
  }
  return weight.toFixed(WEIGHT_DECIMALS);
}

/**
 * Kriteria model yang valid (api-specs 22 §22.3): field dari katalog (`UNKNOWN_VARIABLE`), operator dan bentuk nilai,
 * tipe nilai sesuai `dataType` variabel (AC-37.03), variabel pembanding bertipe sama, lalu bobot -1.000 s.d. 1.000
 * untuk kriteria berbobot (AC-37.04).
 */
export function checkedCriterion(
  input: CriterionInput,
  variables: VariableLookup,
  options: ChoiceOptions,
): Omit<Criterion, "id"> {
  const unknown = (code: string) => {
    const message = SCORING_MODEL_MESSAGES.unknownVariable(code);
    return new DomainError("UNKNOWN_VARIABLE", message, 422, [
      { field: "fieldCode", code: "UNKNOWN_VARIABLE", message },
    ]);
  };
  const field = variables(input.fieldCode);
  if (!field) throw unknown(input.fieldCode);
  const numeric = isNumericType(field.dataType);
  if (!numeric && !TEXT_OPERATORS.has(input.operator)) {
    throw invalidValue(SCORING_MODEL_MESSAGES.operatorNotAllowed(input.operator, field.label));
  }
  assertShape(input.operator, input.value);
  const value = normalized(input.value);
  if (value.type === "VARIABLE") {
    const compared = variables(value.variableCode);
    if (!compared) throw unknown(value.variableCode);
    if (isNumericType(compared.dataType) !== numeric) {
      throw invalidValue(SCORING_MODEL_MESSAGES.variableTypeMismatch(field.label));
    }
  }
  const literals = literalsOf(value);
  if (numeric && literals.some((literal) => !NUMBER_PATTERN.test(literal))) {
    throw invalidValue(SCORING_MODEL_MESSAGES.valueMustBeNumber);
  }
  if (field.dataType === "CHOICE") {
    const allowed = options(input.fieldCode);
    if (literals.some((literal) => !allowed.has(literal))) {
      throw invalidValue(SCORING_MODEL_MESSAGES.valueMustBeOption(field.label));
    }
  }
  return {
    fieldCode: input.fieldCode,
    operator: input.operator,
    value,
    weight: weightOf(input),
    criterionType: input.criterionType,
  };
}
