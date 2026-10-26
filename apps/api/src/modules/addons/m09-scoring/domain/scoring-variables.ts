import type { ParamType, VariableDataType } from "@cikal/contracts";
import { formulaVariableOf } from "../../../core/calculation/index.js";

export interface ScoringVariable {
  label: string;
  dataType: VariableDataType;
  /** Jenis General Parameter untuk label kode pilihan, contoh "001" = "Karyawan Swasta". */
  paramType?: ParamType;
  /** Nama di alasan gagal RAC bila berbeda dari label, contoh "DBR max" (AC-67.02). */
  reasonName?: string;
}

/** Nama alasan gagal RAC yang berbeda dari label katalog (AC-67.02). */
const REASON_NAMES: Readonly<Record<string, string>> = { PRODUCT_DBR_MAX: "DBR max" };

/** Variabel katalog rumus Calculation (FM-10); kode di luar katalog dibaca sebagai angka berlabel kodenya. */
export function variableOf(code: string): ScoringVariable {
  const variable = formulaVariableOf(code);
  if (!variable) return { label: code, dataType: "NUMBER" };
  const reasonName = REASON_NAMES[code];
  return {
    label: variable.label,
    dataType: variable.dataType,
    ...("paramType" in variable ? { paramType: variable.paramType } : {}),
    ...(reasonName ? { reasonName } : {}),
  };
}

/** Variabel yang nilainya dibandingkan sebagai angka desimal. */
export const isNumericType = (dataType: VariableDataType): boolean =>
  dataType === "NUMBER" || dataType === "MONEY" || dataType === "PERCENT";
