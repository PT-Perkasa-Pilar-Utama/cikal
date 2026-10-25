import type { ParamType } from "@cikal/contracts";

export type VariableType = "NUMBER" | "MONEY" | "PERCENT" | "CHOICE";

export interface ScoringVariable {
  label: string;
  dataType: VariableType;
  /** Jenis General Parameter untuk label kode pilihan, contoh "001" = "Karyawan Swasta". */
  paramType?: ParamType;
  /** Nama di alasan gagal RAC bila berbeda dari label, contoh "DBR max" (AC-67.02). */
  reasonName?: string;
}

/**
 * Katalog variabel kriteria RAC dan Scoring (api-specs 09 §9.2, FM-10). Katalog `formula_variables` instalasi dan
 * operasi `GET /formula-variables` dibangun bersama layar model scoring (US-37); sampai itu daftarnya tetap di sini.
 */
export const SCORING_VARIABLES = {
  OCCUPATION: { label: "Occupation", dataType: "CHOICE", paramType: "Occupation" },
  MARITAL: { label: "Marital", dataType: "CHOICE", paramType: "Marital" },
  EDUCATION: { label: "Education", dataType: "CHOICE", paramType: "Education" },
  MONTHLY_INCOME: { label: "Monthly Income", dataType: "MONEY" },
  TENURE_AT_CURRENT_JOB: { label: "Tenure at Current Job", dataType: "NUMBER" },
  AGE: { label: "Age", dataType: "NUMBER" },
  REQUESTED_LIMIT: { label: "Requested Limit", dataType: "MONEY" },
  TENOR: { label: "Tenor", dataType: "NUMBER" },
  INSTALLMENT_TO_INCOME_RATIO: { label: "Installment to Income Ratio", dataType: "PERCENT" },
  PRODUCT_DBR_MAX: { label: "Product DBR Max", dataType: "PERCENT", reasonName: "DBR max" },
} as const satisfies Record<string, ScoringVariable>;

export type VariableCode = keyof typeof SCORING_VARIABLES;

export function isVariableCode(code: string): code is VariableCode {
  return Object.hasOwn(SCORING_VARIABLES, code);
}

/** Variabel yang tidak ada di katalog dibaca sebagai angka dengan kodenya sebagai label. */
export function variableOf(code: string): ScoringVariable {
  return isVariableCode(code) ? SCORING_VARIABLES[code] : { label: code, dataType: "NUMBER" };
}
