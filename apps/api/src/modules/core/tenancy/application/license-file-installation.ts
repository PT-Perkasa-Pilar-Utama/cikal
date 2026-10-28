import { createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import type { LicenseFile } from "@cikal/contracts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { v7 as uuidv7 } from "uuid";
import { tenantProvisioning } from "../db/tenant-provisioning.repository.js";
import { verifyLicenseDocument } from "../domain/license-verification.js";

export interface CompanyRequest {
  companyCode: string;
  /** Wajib bila company belum ada; company yang sudah ada tidak diubah. */
  companyName: string | null;
  address: string | null;
}

/**
 * Isi `LICENSE_FILE` yang tanda tangannya cocok dengan kunci publik image (technical-specs 07 §7.6). File rusak atau
 * ditandatangani kunci lain ditolak dengan pesan AC-100.02.
 */
export function readLicenseFile(path: string, publicKeyPem: string): LicenseFile {
  let document: unknown = null;
  try {
    document = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`License file ${path} cannot be read`, { cause: error });
  }
  const verified = verifyLicenseDocument(document, createPublicKey(publicKeyPem));
  if (!verified) throw new Error("License file is invalid");
  return verified;
}

/** Company dengan kode dari lisensi; dibuat bila belum ada. Mengembalikan `tenant_id`. */
export async function provisionCompany(db: NodePgDatabase, request: CompanyRequest): Promise<string> {
  const existing = await tenantProvisioning.companyId(db, request.companyCode);
  if (existing) return existing;
  if (!request.companyName || !request.address) {
    throw new Error(`Company ${request.companyCode} does not exist yet: --company-name and --address are required`);
  }
  const id = uuidv7();
  await tenantProvisioning.insertCompany(db, {
    id,
    companyCode: request.companyCode,
    companyName: request.companyName,
    address: request.address,
  });
  return id;
}

/**
 * Memasang lisensi terverifikasi untuk company-nya tanpa sesi: saat instalasi (`create-admin`) dan setelah reset
 * (DEPLOYMENT_PLAN F-09). Lisensi yang sudah aktif dibiarkan; nomor yang pernah diganti dan lisensi kedaluwarsa
 * ditolak seperti `POST /license` (api-specs 04 §4.2).
 */
export async function installLicenseFile(
  db: NodePgDatabase,
  document: LicenseFile,
  today: string,
): Promise<{ tenantId: string; installed: boolean }> {
  const { license } = document;
  const tenantId = await tenantProvisioning.companyId(db, license.companyCode);
  if (!tenantId) throw new Error(`Company ${license.companyCode} of the license file does not exist`);
  if (license.validTo < today) throw new Error(`License ${license.licenseNumber} expired on ${license.validTo}`);
  const status = await tenantProvisioning.licenseStatus(db, tenantId, license.licenseNumber);
  if (status === "ACTIVE") return { tenantId, installed: false };
  if (status) throw new Error(`License ${license.licenseNumber} was replaced and cannot be installed again`);
  await tenantProvisioning.replaceActiveLicense(db, tenantId, document);
  return { tenantId, installed: true };
}
