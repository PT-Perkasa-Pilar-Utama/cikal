import type { CriterionInput, CriterionOperator, CriterionTypeCode, ScoringCriterion } from "@cikal/contracts";

/** Isi form "Add Criterion"; nilai daftar dipisah koma kecuali pilihan General Parameter. */
export interface CriterionValues {
  fieldCode: string;
  operator: CriterionOperator;
  valueSource: "LITERAL" | "VARIABLE";
  value: string;
  values: string[];
  from: string;
  to: string;
  variableCode: string;
  criterionType: CriterionTypeCode;
  weight: string;
}

export const EMPTY_CRITERION: CriterionValues = {
  fieldCode: "",
  operator: "EQ",
  valueSource: "LITERAL",
  value: "",
  values: [],
  from: "",
  to: "",
  variableCode: "",
  criterionType: "WEIGHTED",
  weight: "",
};

/** Form ubah kriteria dari kriteria tersimpan. */
export function criterionValues(criterion: ScoringCriterion): CriterionValues {
  const { value } = criterion;
  return {
    ...EMPTY_CRITERION,
    fieldCode: criterion.fieldCode,
    operator: criterion.operator,
    criterionType: criterion.criterionType,
    weight: criterion.weight ?? "",
    valueSource: value.type,
    ...("variableCode" in value && { variableCode: value.variableCode }),
    ...("value" in value && { value: value.value }),
    ...("values" in value && { values: value.values, value: value.values.join(", ") }),
    ...("from" in value && { from: value.from, to: value.to }),
  };
}

/**
 * Body kriteria (api-specs 22 §22.3): nilai literal tetap teks agar tipe yang salah dijawab server
 * "Value must be a number" (AC-37.03); bobot hanya untuk `WEIGHTED`.
 */
export function criterionInput(values: CriterionValues, choice: boolean): CriterionInput {
  return {
    fieldCode: values.fieldCode,
    operator: values.operator,
    criterionType: values.criterionType,
    weight: values.criterionType === "WEIGHTED" && values.weight.trim() ? values.weight.trim() : null,
    value: criterionValue(values, choice),
  };
}

function criterionValue(values: CriterionValues, choice: boolean): CriterionInput["value"] {
  if (values.valueSource === "VARIABLE") return { type: "VARIABLE", variableCode: values.variableCode };
  if (values.operator === "BETWEEN") return { type: "LITERAL", from: values.from.trim(), to: values.to.trim() };
  if (values.operator !== "IN") return { type: "LITERAL", value: values.value.trim() };
  const list = choice ? values.values : values.value.split(",").map((part) => part.trim());
  return { type: "LITERAL", values: list.filter(Boolean) };
}
