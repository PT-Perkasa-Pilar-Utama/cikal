import type { Tx } from "../db/tenant-tx.js";

/** Kunci parameter sistem yang sudah dipakai kode (data dictionary, daftar parameter awal). */
export type SystemParameterKey = "CORE_MAX_TENOR_MONTHS";

/**
 * `param(key, productId?)` Master Data (technical-specs 05 §5.4) untuk modul lain tanpa impor modul masterdata,
 * yang sendiri merujuk tabel produk lewat foreign key. Modul masterdata mendaftarkan implementasinya.
 */
export interface SystemParameterPort {
  /** Nilai berlaku untuk tenant transaksi `tx`: nilai produk, lalu nilai tenant, lalu default (PR-03). */
  value(tx: Tx, key: SystemParameterKey, productId?: string): Promise<string | null>;
}

export const SYSTEM_PARAMETER_PORT = Symbol("SYSTEM_PARAMETER_PORT");
