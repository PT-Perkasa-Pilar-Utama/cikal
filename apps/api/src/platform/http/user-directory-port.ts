import type { Tx } from "../db/tenant-tx.js";

export interface UserRef {
  id: string;
  username: string;
  /** `null` bila user belum punya role. */
  roleName: string | null;
}

/** Role dan unit kerja user untuk lingkup data (technical-specs 09 §9.4); unit kerja kosong = role pusat. */
export interface UserScope {
  roleId: string | null;
  regionalId: string | null;
  branchId: string | null;
  subBranchId: string | null;
}

/**
 * Nama user dan role untuk modul lain (Change Request, Audit) tanpa membaca tabel `iam` (XM-02) dan tanpa
 * impor modul identity, yang sendiri mencatat audit. Modul identity mendaftarkan implementasinya.
 */
export interface UserDirectoryPort {
  /** User tenant transaksi `tx`; id yang tidak ditemukan tidak ada di hasil. */
  describe(tx: Tx, userIds: readonly string[]): Promise<Map<string, UserRef>>;
  /** `null` bila user tidak ada di tenant transaksi `tx`. */
  scope(tx: Tx, userId: string): Promise<UserScope | null>;
}

export const USER_DIRECTORY_PORT = Symbol("USER_DIRECTORY_PORT");
