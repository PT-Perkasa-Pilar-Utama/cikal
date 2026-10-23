import type { LicensePayload, LicenseStatus, ModuleCode } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** File lisensi tidak sah: rusak, diubah, untuk company lain, atau kedaluwarsa (api-specs 04 §4.2, AC-100.02). */
export const licenseInvalidError = (): DomainError =>
  new DomainError("LICENSE_INVALID", "License file is invalid", 422);

/** File lisensi berupa JSON (api-specs 04 §4.2 `UNSUPPORTED_FILE_TYPE`; teks usulan engineering). */
export const licenseFileTypeError = (): DomainError =>
  DomainError.standard("UNSUPPORTED_FILE_TYPE", "Allowed file types: json");

const JSON_MIME_TYPE = "application/json";
const JSON_EXTENSION = ".json";

/** Browser tidak selalu mengirim `application/json` untuk berkas `.json`, jadi ekstensi juga diterima. */
export function isJsonFile(file: { filename: string; mimetype: string }): boolean {
  return file.mimetype === JSON_MIME_TYPE || file.filename.toLowerCase().endsWith(JSON_EXTENSION);
}

export interface InstallFacts {
  /** Kode company sesi. */
  companyCode: string;
  today: string;
  /** Nomor lisensi ini pernah dipasang company yang sama, termasuk yang sudah `REVOKED`. */
  alreadyInstalled: boolean;
}

/**
 * Lisensi terverifikasi boleh dipasang bila untuk company sesi dan `validTo` belum lewat (api-specs 04 §4.2
 * langkah 2 dan 3). Nomor yang pernah dipasang ditolak agar lisensi yang sudah diganti tidak bisa dipasang ulang.
 */
export function isInstallable(license: LicensePayload, facts: InstallFacts): boolean {
  return license.companyCode === facts.companyCode && license.validTo >= facts.today && !facts.alreadyInstalled;
}

/** `EXPIRED` mulai hari setelah `validTo` (LC-06). */
export function licenseStatus(license: LicensePayload, today: string): LicenseStatus {
  return today > license.validTo ? "EXPIRED" : "ACTIVE";
}

/** Modul lisensi yang ada di paket ini; modul di luar manifest tidak ada di image (PK-02, PK-04). */
export function packagedModules(license: LicensePayload, inPackage: ReadonlySet<string>): ModuleCode[] {
  return license.modules.filter((code) => inPackage.has(code));
}
