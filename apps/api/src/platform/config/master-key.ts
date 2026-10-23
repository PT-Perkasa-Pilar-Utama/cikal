import { readFileSync } from "node:fs";

const KEY_BYTES = 32;

/** Kunci utama Base64 32 byte dari file secret (technical-specs 07 §7.4, DEPLOYMENT_PLAN §3.4). */
export function readMasterKey(path: string | undefined): Buffer {
  if (!path) throw new Error("MASTER_KEY_FILE is required");
  let encoded: string;
  try {
    encoded = readFileSync(path, "utf8").trim();
  } catch {
    throw new Error("MASTER_KEY_FILE must reference a readable file");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== KEY_BYTES || key.toString("base64") !== encoded) {
    throw new Error("MASTER_KEY_FILE must contain a Base64-encoded 32-byte key");
  }
  return key;
}
