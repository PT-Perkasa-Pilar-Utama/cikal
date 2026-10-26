import type { CriterionInput } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { checkedCriterion } from "./criterion-rules.js";
import { variableOf } from "./scoring-variables.js";

const occupations = new Set(["001", "002", "003", "004"]);
const check = (input: CriterionInput) => () =>
  checkedCriterion(
    input,
    (code) => (code === "SECRET" ? null : variableOf(code)),
    () => occupations,
  );
const error = (code: string, message: string) => expect.objectContaining({ code, message });

describe("criterion rules", () => {
  it("AC-37.01 accepts Occupation is one of ASN, Karyawan BUMN with weight 50", () => {
    expect(
      check({
        fieldCode: "OCCUPATION",
        operator: "IN",
        value: { type: "LITERAL", values: ["003", "004"] },
        criterionType: "WEIGHTED",
        weight: "50",
      })(),
    ).toEqual({
      fieldCode: "OCCUPATION",
      operator: "IN",
      value: { type: "LITERAL", values: ["003", "004"] },
      weight: "50.00",
      criterionType: "WEIGHTED",
    });
  });

  it("AC-37.02 accepts a mandatory ratio compared with Product DBR Max without a weight", () => {
    expect(
      check({
        fieldCode: "INSTALLMENT_TO_INCOME_RATIO",
        operator: "LE",
        value: { type: "VARIABLE", variableCode: "PRODUCT_DBR_MAX" },
        criterionType: "MANDATORY",
        weight: "10",
      })(),
    ).toMatchObject({ weight: null, criterionType: "MANDATORY" });
  });

  it("AC-37.03 rejects a text value for Monthly Income greater than", () => {
    expect(
      check({
        fieldCode: "MONTHLY_INCOME",
        operator: "GT",
        value: { type: "LITERAL", value: "lima juta" },
        criterionType: "WEIGHTED",
        weight: "10",
      }),
    ).toThrow(error("INVALID_CRITERION_VALUE", "Value must be a number"));
  });

  it("AC-37.04 rejects a weight of 1001 and accepts -1000", () => {
    const criterion = (weight: string): CriterionInput => ({
      fieldCode: "AGE",
      operator: "GE",
      value: { type: "LITERAL", value: "21" },
      criterionType: "WEIGHTED",
      weight,
    });
    expect(check(criterion("1001"))).toThrow(error("WEIGHT_OUT_OF_RANGE", "Weight must be between -1000 and 1000"));
    expect(check(criterion("-1000"))().weight).toBe("-1000.00");
  });

  it("requires a weight for a weighted criterion", () => {
    expect(
      check({ fieldCode: "AGE", operator: "GE", value: { type: "LITERAL", value: "21" }, criterionType: "WEIGHTED" }),
    ).toThrow(error("VALIDATION_FAILED", "Please complete all required fields"));
  });

  it("rejects a field outside the catalog (UNKNOWN_VARIABLE)", () => {
    expect(
      check({
        fieldCode: "SECRET",
        operator: "EQ",
        value: { type: "LITERAL", value: "1" },
        criterionType: "MANDATORY",
      }),
    ).toThrow(error("UNKNOWN_VARIABLE", "Unknown field: SECRET"));
  });

  it("rejects a choice code that is not an option of the field", () => {
    expect(
      check({
        fieldCode: "OCCUPATION",
        operator: "IN",
        value: { type: "LITERAL", values: ["999"] },
        criterionType: "MANDATORY",
      }),
    ).toThrow(error("INVALID_CRITERION_VALUE", "Value must be one of the Occupation options"));
  });

  it("rejects a value that does not fit the operator", () => {
    expect(
      check({
        fieldCode: "AGE",
        operator: "BETWEEN",
        value: { type: "LITERAL", value: "21" },
        criterionType: "MANDATORY",
      }),
    ).toThrow(error("INVALID_CRITERION_VALUE", "Value is required"));
    expect(
      check({
        fieldCode: "OCCUPATION",
        operator: "GT",
        value: { type: "LITERAL", value: "001" },
        criterionType: "MANDATORY",
      }),
    ).toThrow(error("INVALID_CRITERION_VALUE", "Operator GT cannot be used for Occupation"));
  });

  it("rejects comparing a number field with a choice field", () => {
    expect(
      check({
        fieldCode: "AGE",
        operator: "EQ",
        value: { type: "VARIABLE", variableCode: "OCCUPATION" },
        criterionType: "MANDATORY",
      }),
    ).toThrow(error("INVALID_CRITERION_VALUE", "The compared field must have the same type as Age"));
  });
});
