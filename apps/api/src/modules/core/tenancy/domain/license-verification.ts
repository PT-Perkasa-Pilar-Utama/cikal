import { type KeyObject, verify } from "node:crypto";
import { canonicalLicensePayload, type LicenseFile, licenseFileSchema } from "@cikal/contracts";

/**
 * File lisensi bila dokumen utuh dan tanda tangan Ed25519-nya cocok dengan kunci publik PPU; `null` bila bentuknya
 * salah atau isinya diubah setelah diterbitkan (AC-100.02, LC-03).
 */
export function verifyLicenseDocument(document: unknown, publicKey: KeyObject): LicenseFile | null {
  const parsed = licenseFileSchema.safeParse(document);
  if (!parsed.success) return null;
  const { license, signature } = parsed.data;
  const signed = Buffer.from(canonicalLicensePayload(license));
  return verify(null, signed, publicKey, Buffer.from(signature, "base64")) ? parsed.data : null;
}
