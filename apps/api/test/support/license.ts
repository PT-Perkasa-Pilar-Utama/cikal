import type { LicenseFile, LicensePayload } from "@cikal/contracts";
import { generateLicenseKeys, issueLicense } from "@cikal/license-cli";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";
import { businessDate } from "../../src/platform/clock/business-date.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal bisnis `days` hari dari sekarang, agar lisensi uji tidak kedaluwarsa seiring waktu. */
export const businessDateIn = (days: number): string => businessDate(new Date(Date.now() + days * DAY_MS));

/**
 * Kunci lisensi uji per proses Vitest. Konfigurasi uji mempercayai kunci publik ini, bukan kunci dev yang tertanam
 * di build, sehingga uji bisa menerbitkan lisensi lewat penerbit `tools/license-cli`.
 */
export const testLicenseKeys = generateLicenseKeys();

/** Lisensi POC (TASK_BREAKDOWN "Lisensi POC") ditambah M14 yang tidak ada di paket, seperti contoh AC-100.01. */
export const POC_LICENSE_MODULES: LicensePayload["modules"] = [
  "CORE",
  "M06",
  "M07",
  "M08",
  "M09",
  "M10",
  "M11",
  "M14",
  "M15",
];

let issued = 0;

/** File lisensi bertanda tangan kunci uji; nomor lisensi unik bila tidak diatur. */
export function issueTestLicense(overrides: Partial<LicensePayload> = {}): LicenseFile {
  issued += 1;
  return issueLicense(
    {
      licenseNumber: `PPU-LIC-TEST-${String(issued).padStart(4, "0")}`,
      companyCode: "001",
      deploymentType: "ON_PREMISE",
      modules: POC_LICENSE_MODULES,
      validFrom: businessDateIn(-1),
      validTo: businessDateIn(365),
      maxUsers: null,
      ...overrides,
    },
    testLicenseKeys.privateKey,
  );
}

/**
 * Lisensi aktif company ditulis langsung lewat role pemilik skema dan menggantikan lisensi aktif sebelumnya. Aplikasi
 * yang sudah berjalan menyimpan cache lisensi, jadi panggil sebelum aplikasi dibuat atau buang cache-nya.
 */
export async function installTestLicense(
  owner: pg.Pool,
  file: LicenseFile,
  tenantId: string = seedCompanyIds.company001,
): Promise<void> {
  const { license, signature } = file;
  await owner.query("update tenancy.licenses set status = 'REVOKED' where tenant_id = $1 and status = 'ACTIVE'", [
    tenantId,
  ]);
  await owner.query(
    `insert into tenancy.licenses
       (id, tenant_id, license_number, deployment_type, valid_from, valid_to, max_users, signature, raw_document, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')`,
    [
      uuidv7(),
      tenantId,
      license.licenseNumber,
      license.deploymentType,
      license.validFrom,
      license.validTo,
      license.maxUsers,
      Buffer.from(signature, "base64"),
      file,
    ],
  );
}

export interface UploadOptions {
  filename?: string;
  contentType?: string;
}

/** Body `multipart/form-data` dengan satu berkas di field `file` untuk `app.inject` (api-specs 04 §4.2). */
export function licenseUpload(
  content: string | Buffer,
  options: UploadOptions = {},
): { payload: Buffer; headers: Record<string, string> } {
  const boundary = `cikal-${uuidv7()}`;
  const head =
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${options.filename ?? "license.json"}"\r\n` +
    `Content-Type: ${options.contentType ?? "application/json"}\r\n\r\n`;
  return {
    payload: Buffer.concat([Buffer.from(head), Buffer.from(content), Buffer.from(`\r\n--${boundary}--\r\n`)]),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}
