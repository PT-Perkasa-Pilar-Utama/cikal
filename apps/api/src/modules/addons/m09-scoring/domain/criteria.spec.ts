import { describe, expect, it } from "vitest";
import { type Criterion, evaluateCriterion } from "./criteria.js";
import { racOutcome, scoringOutcome } from "./model-outcome.js";

const LABELS: Readonly<Record<string, string>> = { "001": "Karyawan Swasta", "002": "Pegawai Negeri Sipil" };
const label = (_field: string, code: string) => LABELS[code] ?? code;

const dbrRule: Criterion = {
  id: "c-dbr",
  fieldCode: "INSTALLMENT_TO_INCOME_RATIO",
  operator: "LE",
  value: { type: "VARIABLE", variableCode: "PRODUCT_DBR_MAX" },
  weight: null,
  criterionType: "MANDATORY",
};
const occupation: Criterion = {
  id: "c-occ",
  fieldCode: "OCCUPATION",
  operator: "IN",
  value: { type: "LITERAL", values: ["001", "002"] },
  weight: "100.00",
  criterionType: "WEIGHTED",
};
const income: Criterion = {
  id: "c-income",
  fieldCode: "MONTHLY_INCOME",
  operator: "GE",
  value: { type: "LITERAL", value: "5000000.00" },
  weight: "80.00",
  criterionType: "WEIGHTED",
};

describe("criteria", () => {
  it("AC-67.02 fails the mandatory ratio with the actual value and the DBR max in the reason", () => {
    const evaluation = evaluateCriterion(
      dbrRule,
      { INSTALLMENT_TO_INCOME_RATIO: "332.1431", PRODUCT_DBR_MAX: "40.0000" },
      label,
    );

    expect(evaluation).toEqual({
      criterionId: "c-dbr",
      displayText: "Installment to Income Ratio <= Product DBR Max",
      actualValue: "332.1431",
      isMet: false,
      appliedWeight: null,
      failedReason: "Installment to Income Ratio 332% exceeds DBR max 40%",
    });
    expect(racOutcome([evaluation])).toEqual({
      result: "FAIL",
      failedReasons: ["Installment to Income Ratio 332% exceeds DBR max 40%"],
    });
  });

  it("AC-67.03 passes a ratio exactly at the DBR max", () => {
    const evaluation = evaluateCriterion(
      dbrRule,
      { INSTALLMENT_TO_INCOME_RATIO: "40.0000", PRODUCT_DBR_MAX: "40.0000" },
      label,
    );

    expect(evaluation).toMatchObject({ isMet: true, failedReason: null });
    expect(racOutcome([evaluation]).result).toBe("PASS");
  });

  it("fails a mandatory criterion without data and says the value is not available", () => {
    expect(evaluateCriterion(dbrRule, { PRODUCT_DBR_MAX: "40.0000" }, label).failedReason).toBe(
      "Installment to Income Ratio is not available",
    );
  });

  it("shows choice labels and the weight in the display text", () => {
    expect(evaluateCriterion(occupation, { OCCUPATION: "001" }, label)).toEqual({
      criterionId: "c-occ",
      displayText: "Occupation is one of Karyawan Swasta, Pegawai Negeri Sipil : +100",
      actualValue: "Karyawan Swasta",
      isMet: true,
      appliedWeight: "100.00",
      failedReason: null,
    });
  });

  it("AC-67.01 adds the weights of met criteria to the constant and passes at or above the cut off", () => {
    const evaluations = [
      evaluateCriterion(occupation, { OCCUPATION: "001" }, label),
      evaluateCriterion(income, { MONTHLY_INCOME: "8000000.00" }, label),
    ];

    expect(scoringOutcome({ constant: "200.00", cutOff: "280.00", reviewLowerBound: null }, evaluations)).toEqual({
      totalScore: "380.00",
      result: "PASS",
    });
    expect(scoringOutcome({ constant: "200.00", cutOff: "380.00", reviewLowerBound: null }, evaluations).result).toBe(
      "PASS",
    );
  });

  it("reviews a score between the review lower bound and the cut off, and fails below it", () => {
    const evaluations = [evaluateCriterion(income, { MONTHLY_INCOME: "1000000.00" }, label)];
    const model = { constant: "200.00", cutOff: "430.00", reviewLowerBound: "150.00" };

    expect(evaluations[0]).toMatchObject({ isMet: false, appliedWeight: "0.00" });
    expect(scoringOutcome(model, evaluations)).toEqual({ totalScore: "200.00", result: "REVIEW" });
    expect(scoringOutcome({ ...model, reviewLowerBound: null }, evaluations).result).toBe("FAIL");
  });
});
