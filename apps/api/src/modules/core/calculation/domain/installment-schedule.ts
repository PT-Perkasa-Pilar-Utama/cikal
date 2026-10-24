import { buildSchedule, FormulaError, type InterestType, type ScheduleRow } from "@cikal/formula";
import { Decimal } from "decimal.js";
import { defaultFormulas, type FormulaCode } from "./default-formulas.js";
import { type FormulaRun, formulaFailure } from "./formula-run.js";

export interface InstallmentTerms {
  interestType: InterestType;
  principal: Decimal;
  tenor: number;
  /** Suku bunga % per tahun. */
  interestRate: Decimal;
  firstInstallmentDate: Date;
}

export interface InstallmentSchedule {
  monthlyInstallment: Decimal;
  totalInterest: Decimal;
  totalPayment: Decimal;
  rows: ScheduleRow[];
  /** Kode rumus yang dipakai, untuk `formulaVersions` (FM-05). */
  formulaCodes: FormulaCode[];
}

const INSTALLMENT_FORMULA = {
  FLAT: "INSTALLMENT_FLAT",
  EFFECTIVE: "INSTALLMENT_EFFECTIVE",
} as const satisfies Record<InterestType, FormulaCode>;

const DUE_DATE_FORMULA = "INSTALLMENT_DUE_DATE";

const sum = (values: Decimal[]): Decimal => values.reduce((total, value) => total.plus(value), new Decimal(0));

/**
 * `schedule(principal, tenor, rate, type, firstDate)` (technical-specs 05 §5.16): angsuran dari rumus jenis
 * bunganya, tanggal jatuh tempo dari `INSTALLMENT_DUE_DATE`, lalu pemecahan pokok dan bunga per baris (RM-19).
 */
export function installmentSchedule(run: FormulaRun, terms: InstallmentTerms): InstallmentSchedule {
  const code = INSTALLMENT_FORMULA[terms.interestType];
  const installment = run.number(code, {
    loanAmount: terms.principal,
    tenor: new Decimal(terms.tenor),
    interestRate: terms.interestRate,
  });
  const dueDates = Array.from({ length: terms.tenor }, (_, index) =>
    run.date(DUE_DATE_FORMULA, {
      firstInstallmentDate: terms.firstInstallmentDate,
      installmentNo: new Decimal(index + 1),
    }),
  );
  const rounding = defaultFormulas[code].rounding;
  let rows: ScheduleRow[];
  try {
    rows = buildSchedule({ ...terms, annualRate: terms.interestRate, installment, dueDates, rounding });
  } catch (error) {
    if (error instanceof FormulaError) throw formulaFailure(code, error.message);
    throw error;
  }
  return {
    monthlyInstallment: rows[0]?.installmentAmount ?? installment,
    totalInterest: sum(rows.map((row) => row.interestAmount)),
    totalPayment: sum(rows.map((row) => row.installmentAmount)),
    rows,
    formulaCodes: [code, DUE_DATE_FORMULA],
  };
}
