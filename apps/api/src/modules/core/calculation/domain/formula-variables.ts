import type { ModuleCode, ParamType, VariableDataType, VariableSource } from "@cikal/contracts";

export interface FormulaVariableDefinition {
  /** Nama variabel di teks kriteria, contoh "Installment to Income Ratio" (AC-37.02). */
  label: string;
  dataType: VariableDataType;
  /** Satuan yang ditambahkan ke label dropdown "Field", contoh "Installment to Income Ratio (%)". */
  unit?: "%";
  /** Jenis General Parameter kode pilihan, contoh "001" = "Karyawan Swasta". */
  paramType?: ParamType;
  source: VariableSource;
  /** Modul pemilik data; variabel modul tanpa lisensi tidak bisa dipilih (LC-04). */
  moduleCode: ModuleCode;
  /** Boleh dipakai di kriteria scoring dan RAC (FM-10). */
  usableInScoring: boolean;
}

/**
 * Katalog FormulaVariable instalasi (data dictionary, api-specs 09 §9.2, FM-10). Katalog dikelola tim engineer dan
 * berubah hanya lewat rilis, jadi disimpan di kode, bukan tabel tenant.
 */
export const FORMULA_VARIABLES = {
  OCCUPATION: {
    label: "Occupation",
    dataType: "CHOICE",
    paramType: "Occupation",
    source: "APPLICATION",
    moduleCode: "CORE",
    usableInScoring: true,
  },
  MARITAL: {
    label: "Marital",
    dataType: "CHOICE",
    paramType: "Marital",
    source: "APPLICATION",
    moduleCode: "CORE",
    usableInScoring: true,
  },
  EDUCATION: {
    label: "Education",
    dataType: "CHOICE",
    paramType: "Education",
    source: "APPLICATION",
    moduleCode: "CORE",
    usableInScoring: true,
  },
  MONTHLY_INCOME: {
    label: "Monthly Income",
    dataType: "MONEY",
    source: "APPLICATION",
    moduleCode: "CORE",
    usableInScoring: true,
  },
  TENURE_AT_CURRENT_JOB: {
    label: "Tenure at Current Job",
    dataType: "NUMBER",
    source: "APPLICATION",
    moduleCode: "CORE",
    usableInScoring: true,
  },
  AGE: { label: "Age", dataType: "NUMBER", source: "APPLICATION", moduleCode: "CORE", usableInScoring: true },
  REQUESTED_LIMIT: {
    label: "Requested Limit",
    dataType: "MONEY",
    source: "APPLICATION",
    moduleCode: "CORE",
    usableInScoring: true,
  },
  TENOR: { label: "Tenor", dataType: "NUMBER", source: "APPLICATION", moduleCode: "CORE", usableInScoring: true },
  INSTALLMENT_TO_INCOME_RATIO: {
    label: "Installment to Income Ratio",
    dataType: "PERCENT",
    unit: "%",
    source: "FORMULA",
    moduleCode: "CORE",
    usableInScoring: true,
  },
  PRODUCT_DBR_MAX: {
    label: "Product DBR Max",
    dataType: "PERCENT",
    source: "PRODUCT",
    moduleCode: "CORE",
    usableInScoring: true,
  },
} as const satisfies Record<string, FormulaVariableDefinition>;

export type FormulaVariableCode = keyof typeof FORMULA_VARIABLES;

export function isFormulaVariableCode(code: string): code is FormulaVariableCode {
  return Object.hasOwn(FORMULA_VARIABLES, code);
}

/** Definisi variabel; `null` bila kode tidak ada di katalog. */
export function formulaVariableOf(code: string): FormulaVariableDefinition | null {
  return isFormulaVariableCode(code) ? FORMULA_VARIABLES[code] : null;
}
