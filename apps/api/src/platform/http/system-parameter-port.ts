import type { Tx } from "../db/tenant-tx.js";

/** Kunci parameter sistem yang sudah dipakai kode (data dictionary, daftar parameter awal). */
export type SystemParameterKey =
  | "CORE_MAX_TENOR_MONTHS"
  | "UPLOAD_MAX_MB"
  | "NPWP_MIN_LIMIT"
  | "REQUIRE_CONSENT_FOR_EXTERNAL_CHECK"
  | "SELF_EMPLOYED_ONLY"
  | "SELF_EMPLOYED_OCCUPATIONS"
  | "EMPLOYED_INCOME_SOURCES"
  | "DUE_DATE_END_OF_MONTH";

/**
 * `param(key, productId?)` Master Data (technical-specs 05 §5.4) untuk modul lain tanpa impor modul masterdata,
 * yang sendiri merujuk tabel produk lewat foreign key. Modul masterdata mendaftarkan implementasinya.
 */
export interface SystemParameterPort {
  /** Nilai berlaku untuk tenant transaksi `tx`: nilai produk, lalu nilai tenant, lalu default (PR-03). */
  value(tx: Tx, key: SystemParameterKey, productId?: string): Promise<string | null>;
  /** Nilai parameter `BOOLEAN` (`"true"` atau `"false"`); kosong dibaca `false`. */
  flag(tx: Tx, key: SystemParameterKey, productId?: string): Promise<boolean>;
  /** Nilai parameter `MULTI_CHOICE` (larik JSON berisi teks); kosong dibaca larik kosong. */
  choices(tx: Tx, key: SystemParameterKey, productId?: string): Promise<string[]>;
  /**
   * `snapshotLocked(productId)`: semua parameter `lockOnSubmit` dengan urutan nilai yang sama, untuk disimpan di
   * ProcessInstance saat submit (PR-06). Parameter tanpa nilai tidak ikut.
   */
  snapshotLocked(tx: Tx, productId: string): Promise<Record<string, string>>;
}

export const SYSTEM_PARAMETER_PORT = Symbol("SYSTEM_PARAMETER_PORT");
