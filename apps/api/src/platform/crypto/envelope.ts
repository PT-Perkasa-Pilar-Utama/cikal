import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
export const DATA_KEY_BYTES = 32;

/** Format bytea: IV 12 byte, tag 16 byte, ciphertext; AAD mengikat tenant, tujuan, dan versi (DM-08). */
export function seal(key: Buffer, value: Buffer, context: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

/** Autentikasi dilakukan sebelum plaintext dikembalikan; perubahan tag atau AAD ditolak (tech 07 §7.4). */
export function unseal(key: Buffer, value: Buffer, context: string): Buffer {
  if (value.length < IV_BYTES + TAG_BYTES) throw new Error("Invalid encrypted value");
  const decipher = createDecipheriv(ALGORITHM, key, value.subarray(0, IV_BYTES), { authTagLength: TAG_BYTES });
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(value.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(value.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
}
