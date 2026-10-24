import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { FormulaRun } from "./formula-run.js";

const credit = {
  loanAmount: new Decimal("50000000"),
  adminFee: new Decimal("250000"),
  provisionFee: new Decimal("1"),
  salesFee: new Decimal("100000"),
  insuranceValue: new Decimal("300000"),
};

describe("FormulaRun", () => {
  it("computes the default credit structure, evaluating referenced formulas first (RM-07)", () => {
    const run = new FormulaRun({});

    expect(run.number("NET_DISBURSEMENT", credit).toString()).toBe("48950000");
    expect(run.number("SALES_FEE_AMOUNT", credit).toString()).toBe("100000");
    expect(run.executions.map((execution) => execution.formulaCode)).toEqual([
      "ADMIN_FEE_AMOUNT",
      "PROVISION_FEE_AMOUNT",
      "NET_DISBURSEMENT",
      "SALES_FEE_AMOUNT",
    ]);
    expect(run.executions[2]?.inputValues).toMatchObject({
      ADMIN_FEE_AMOUNT: "250000",
      PROVISION_FEE_AMOUNT: "500000",
    });
  });

  it("computes DBR and DSR as percentages with four decimals (RM-08)", () => {
    const run = new FormulaRun({});
    const income = { monthlyInstallment: new Decimal("2000000"), monthlyIncomeAllowance: new Decimal("6000000") };

    expect(run.number("DBR_RATIO", income).toFixed(4)).toBe("33.3333");
    expect(run.number("DSR_RATIO", { ...income, existingInstallment: new Decimal("1000000") }).toFixed(4)).toBe(
      "50.0000",
    );
  });

  it("throws FORMULA_ERROR with the formula code and logs the failure instead of defaulting (FM-09)", () => {
    const run = new FormulaRun({});

    let caught: unknown;
    try {
      run.number("DBR_RATIO", { monthlyInstallment: new Decimal("2000000"), monthlyIncomeAllowance: new Decimal(0) });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DomainError);
    expect(caught).toMatchObject({
      code: "FORMULA_ERROR",
      status: 422,
      message: "Division by zero",
      details: [{ field: "DBR_RATIO", code: "FORMULA_ERROR", message: "Division by zero" }],
    });
    expect(run.executions).toEqual([
      expect.objectContaining({
        formulaCode: "DBR_RATIO",
        status: "ERROR",
        result: null,
        errorMessage: "Division by zero",
      }),
    ]);
  });

  it("rejects a formula input that is missing", () => {
    const run = new FormulaRun({});

    expect(() => run.number("PROVISION_FEE_AMOUNT", { loanAmount: credit.loanAmount })).toThrow(
      "Variable provisionFee has no value",
    );
  });
});
