import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateLicenseKeys } from "./license.js";

export const SIGNING_KEY_FILE = "license-signing-key.pem";
export const PUBLIC_KEY_FILE = "license-public-key.pem";
const PRIVATE_FILE_MODE = 0o600;
const PRIVATE_DIR_MODE = 0o700;

/** `wx`: file yang sudah ada tidak ditimpa, sehingga kunci atau lisensi lama tidak hilang tanpa sengaja. */
export function writeNewFile(path: string, content: string, mode?: number): void {
  writeFileSync(path, content, { flag: "wx", ...(mode === undefined ? {} : { mode }) });
}

/**
 * Pasangan kunci baru di `dir` (DEPLOYMENT_PLAN §3.11). Folder dibuat dengan mode 700 bila belum ada; kunci yang
 * sudah ada tidak ditimpa. Mengembalikan path kedua file.
 */
export function writeLicenseKeyFiles(dir: string): { signingKey: string; publicKey: string } {
  mkdirSync(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
  const keys = generateLicenseKeys();
  const paths = { signingKey: join(dir, SIGNING_KEY_FILE), publicKey: join(dir, PUBLIC_KEY_FILE) };
  writeNewFile(paths.signingKey, keys.privateKey, PRIVATE_FILE_MODE);
  writeNewFile(paths.publicKey, keys.publicKey);
  return paths;
}
