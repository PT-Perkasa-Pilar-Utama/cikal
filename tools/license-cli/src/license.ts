import { createPrivateKey, createPublicKey, generateKeyPairSync, type KeyObject, sign, verify } from "node:crypto";
import {
  canonicalLicensePayload,
  type LicenseFile,
  type LicensePayload,
  licenseFileSchema,
  licensePayloadSchema,
} from "@cikal/contracts";

/** Kunci PEM: privat PKCS#8 hanya di tim PPU, publik SPKI tertanam di image (technical-specs 07 §7.6). */
export interface LicenseKeys {
  privateKey: string;
  publicKey: string;
}

const KEY_TYPE = "ed25519";

function ed25519(key: KeyObject): KeyObject {
  if (key.asymmetricKeyType !== KEY_TYPE) throw new Error("License keys must be Ed25519 keys");
  return key;
}

/** Pasangan kunci Ed25519 baru untuk menandatangani lisensi (LC-03). */
export function generateLicenseKeys(): LicenseKeys {
  return generateKeyPairSync(KEY_TYPE, {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
}

/** File lisensi bertanda tangan; isi divalidasi skema kontrak sebelum isi kanoniknya ditandatangani (US-100). */
export function issueLicense(payload: LicensePayload, privateKeyPem: string): LicenseFile {
  const license = licensePayloadSchema.parse(payload);
  const key = ed25519(createPrivateKey(privateKeyPem));
  const signature = sign(null, Buffer.from(canonicalLicensePayload(license)), key);
  return { license, signature: signature.toString("base64") };
}

/** Isi lisensi bila file utuh dan tanda tangannya cocok dengan kunci publik; `null` bila tidak (AC-100.02). */
export function checkLicense(file: unknown, publicKeyPem: string): LicensePayload | null {
  const parsed = licenseFileSchema.safeParse(file);
  if (!parsed.success) return null;
  const { license, signature } = parsed.data;
  const key = ed25519(createPublicKey(publicKeyPem));
  return verify(null, Buffer.from(canonicalLicensePayload(license)), key, Buffer.from(signature, "base64"))
    ? license
    : null;
}
