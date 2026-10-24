import type { RoundingMode } from "@cikal/formula";

export type FormulaResultType = "MONEY" | "PERCENT" | "DATE";

export interface FormulaDefinition {
  resultType: FormulaResultType;
  expression: string;
  rounding: { mode: RoundingMode; scale: number } | null;
}

/** Rupiah penuh `HALF_UP` (FM-07). */
const MONEY = { mode: "HALF_UP", scale: 0 } as const;
/** Persen empat desimal sesuai `numeric(9,4)` (DM-06). */
const PERCENT = { mode: "HALF_UP", scale: 4 } as const;

/**
 * Rumus default bawaan aplikasi (FM-12, tech ref 11.12): angsuran per jenis bunga dan tanggal jatuh tempo (RM-19),
 * struktur kredit (RM-07), dan DBR/DSR (RM-08). Versi rumus per tenant atau produk menunggu layar rumus
 * (api-specs 09 §9.3), jadi POC selalu memakai daftar ini.
 */
export const defaultFormulas = {
  INSTALLMENT_FLAT: {
    resultType: "MONEY",
    expression: "loanAmount / tenor + loanAmount * interestRate / 100 / 12",
    rounding: MONEY,
  },
  INSTALLMENT_EFFECTIVE: {
    resultType: "MONEY",
    expression: "PMT(interestRate / 100 / 12, tenor, -loanAmount)",
    rounding: MONEY,
  },
  INSTALLMENT_DUE_DATE: {
    resultType: "DATE",
    expression: "ADDMONTHS(firstInstallmentDate, installmentNo - 1)",
    rounding: null,
  },
  ADMIN_FEE_AMOUNT: { resultType: "MONEY", expression: "adminFee", rounding: MONEY },
  PROVISION_FEE_AMOUNT: { resultType: "MONEY", expression: "loanAmount * provisionFee / 100", rounding: MONEY },
  SALES_FEE_AMOUNT: { resultType: "MONEY", expression: "salesFee", rounding: MONEY },
  NET_DISBURSEMENT: {
    resultType: "MONEY",
    expression: "loanAmount - ADMIN_FEE_AMOUNT - PROVISION_FEE_AMOUNT - insuranceValue",
    rounding: MONEY,
  },
  DBR_RATIO: {
    resultType: "PERCENT",
    expression: "monthlyInstallment / monthlyIncomeAllowance * 100",
    rounding: PERCENT,
  },
  DSR_RATIO: {
    resultType: "PERCENT",
    expression: "(monthlyInstallment + existingInstallment) / monthlyIncomeAllowance * 100",
    rounding: PERCENT,
  },
} as const satisfies Record<string, FormulaDefinition>;

export type FormulaCode = keyof typeof defaultFormulas;

export function isFormulaCode(name: string): name is FormulaCode {
  return Object.hasOwn(defaultFormulas, name);
}
