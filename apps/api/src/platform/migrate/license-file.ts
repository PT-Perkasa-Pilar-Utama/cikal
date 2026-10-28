import type pg from "pg";
import { installLicenseFile, readLicenseFile } from "../../modules/core/tenancy/index.js";
import { businessDate } from "../clock/business-date.js";
import { inTransaction } from "./transaction.js";

/**
 * Pemasang `LICENSE_FILE` untuk company yang sudah di-seed: subperintah `install-license` dan langkah setelah seed
 * reset (DEPLOYMENT_PLAN F-09). Image rilis hanya mempercayai kunci PPU, jadi lisensi dev dari seed tidak berlaku di
 * SIT dan UAT. File dibaca dan diverifikasi saat pemasang dibuat, sebelum reset dimulai, jadi file rusak tidak sempat
 * mengosongkan database. `null` tanpa `LICENSE_FILE`.
 */
export function licenseFileInstaller(
  pool: pg.Pool,
  licenseFile: string | null,
  publicKeyPem: string,
): (() => Promise<void>) | null {
  if (!licenseFile) return null;
  const license = readLicenseFile(licenseFile, publicKeyPem);
  return async () => {
    await inTransaction(pool, (db) => installLicenseFile(db, license, businessDate(new Date())));
  };
}
