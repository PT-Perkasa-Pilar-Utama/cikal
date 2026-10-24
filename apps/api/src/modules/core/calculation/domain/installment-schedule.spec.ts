import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { FormulaRun } from "./formula-run.js";
import { type InstallmentTerms, installmentSchedule } from "./installment-schedule.js";

const terms = (overrides: Partial<InstallmentTerms> = {}): InstallmentTerms => ({
  interestType: "EFFECTIVE",
  principal: new Decimal("100000000"),
  tenor: 12,
  interestRate: new Decimal("12"),
  firstInstallmentDate: new Date("2026-11-21T00:00:00Z"),
  ...overrides,
});
const amounts = (values: Decimal[]) => values.map((value) => value.toString());

describe("installmentSchedule", () => {
  it("AC-51.01 shows the effective installment Rp8.884.879 and 12 rows ending at Rp0", () => {
    const result = installmentSchedule(new FormulaRun({}), terms());

    expect(result.monthlyInstallment.toString()).toBe("8884879");
    expect(result.rows).toHaveLength(12);
    expect(result.rows.at(-1)?.outstandingAmount.toString()).toBe("0");
  });

  it("AC-51.02 TRM_INS_001 puts the flat principal rounding difference of Rp4 in the 12th installment", () => {
    const { rows } = installmentSchedule(new FormulaRun({}), terms({ interestType: "FLAT" }));

    expect(new Set(amounts(rows.slice(0, 11).map((row) => row.installmentAmount)))).toEqual(new Set(["9333333"]));
    expect(new Set(amounts(rows.slice(0, 11).map((row) => row.principalAmount)))).toEqual(new Set(["8333333"]));
    expect(new Set(amounts(rows.map((row) => row.interestAmount)))).toEqual(new Set(["1000000"]));
    expect(rows[11]?.installmentAmount.toString()).toBe("9333337");
    expect(rows[11]?.outstandingAmount.toString()).toBe("0");
  });

  it("AC-51.02 TRM_INS_002 keeps the effective installment at Rp8.884.879 with falling interest and rising principal", () => {
    const { rows } = installmentSchedule(new FormulaRun({}), terms());

    expect(new Set(amounts(rows.slice(0, 11).map((row) => row.installmentAmount)))).toEqual(new Set(["8884879"]));
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index]?.interestAmount.lt(rows[index - 1]?.interestAmount ?? 0)).toBe(true);
      expect(rows[index]?.principalAmount.gt(rows[index - 1]?.principalAmount ?? 0)).toBe(true);
    }
  });

  it("AC-51.04 charges Rp1.000.000 a month without interest at a 0% flat rate", () => {
    const result = installmentSchedule(
      new FormulaRun({}),
      terms({ interestType: "FLAT", principal: new Decimal("12000000"), interestRate: new Decimal("0") }),
    );

    expect(new Set(amounts(result.rows.map((row) => row.installmentAmount)))).toEqual(new Set(["1000000"]));
    expect(result.totalInterest.toString()).toBe("0");
  });

  it("AC-51.04 charges no interest at a 0% effective rate", () => {
    const result = installmentSchedule(
      new FormulaRun({}),
      terms({ principal: new Decimal("12000000"), interestRate: new Decimal("0") }),
    );

    expect(result.monthlyInstallment.toString()).toBe("1000000");
    expect(result.totalInterest.toString()).toBe("0");
  });

  it("dates each installment one month apart and keeps month ends inside the month by default (RM-19)", () => {
    const { rows } = installmentSchedule(
      new FormulaRun({}),
      terms({ tenor: 3, firstInstallmentDate: new Date("2027-01-31T00:00:00Z") }),
    );

    expect(rows.map((row) => row.dueDate.toISOString().slice(0, 10))).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
    ]);
  });

  it("moves a missing day to the first of the next month when DUE_DATE_END_OF_MONTH says so (RM-19)", () => {
    const { rows } = installmentSchedule(
      new FormulaRun({ endOfMonth: "NEXT_MONTH_FIRST_DAY" }),
      terms({ tenor: 2, firstInstallmentDate: new Date("2027-01-31T00:00:00Z") }),
    );

    expect(rows[1]?.dueDate.toISOString().slice(0, 10)).toBe("2027-03-01");
  });

  it("logs every formula execution with its inputs (FM-08)", () => {
    const run = new FormulaRun({});
    installmentSchedule(run, terms({ tenor: 2 }));

    expect(run.executions.map((execution) => execution.formulaCode)).toEqual([
      "INSTALLMENT_EFFECTIVE",
      "INSTALLMENT_DUE_DATE",
      "INSTALLMENT_DUE_DATE",
    ]);
    expect(run.executions[0]).toMatchObject({
      formulaVersionId: null,
      inputValues: { interestRate: "12", tenor: "2", loanAmount: "100000000" },
      result: "50751244",
      status: "SUCCESS",
    });
  });
});
