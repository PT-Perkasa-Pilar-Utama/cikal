import type { Tx } from "../db/tenant-tx.js";

export interface UserRef {
  id: string;
  username: string;
  /** `null` bila user belum punya role. */
  roleName: string | null;
}

/**
 * Nama user dan role untuk modul lain (Change Request, Audit) tanpa membaca tabel `iam` (XM-02) dan tanpa
 * impor modul identity, yang sendiri mencatat audit. Modul identity mendaftarkan implementasinya.
 */
export interface UserDirectoryPort {
  /** User tenant transaksi `tx`; id yang tidak ditemukan tidak ada di hasil. */
  describe(tx: Tx, userIds: readonly string[]): Promise<Map<string, UserRef>>;
}

export const USER_DIRECTORY_PORT = Symbol("USER_DIRECTORY_PORT");
