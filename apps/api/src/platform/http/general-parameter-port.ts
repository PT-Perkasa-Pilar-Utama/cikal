import type { ParameterOption, ParamType } from "@cikal/contracts";
import type { Tx } from "../db/tenant-tx.js";

/**
 * Nilai General Parameter (technical-specs 05 §5.4) untuk modul lain tanpa impor modul masterdata, yang sendiri
 * merujuk tabel produk lewat foreign key. Modul masterdata mendaftarkan implementasinya.
 */
export interface GeneralParameterPort {
  /** Nilai `paramType` di tenant transaksi `tx`, urut `paramId`; nonaktif hanya bila `includeInactive`. */
  options(tx: Tx, paramType: ParamType, options?: { includeInactive: boolean }): Promise<ParameterOption[]>;
}

export const GENERAL_PARAMETER_PORT = Symbol("GENERAL_PARAMETER_PORT");
