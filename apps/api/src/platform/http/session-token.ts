import { createHash, timingSafeEqual } from "node:crypto";

/** Nama cookie dan header sesi web (api-specs 02 §2.1). */
export const SESSION_COOKIE = "cikal_sid";
export const CSRF_COOKIE = "cikal_csrf";
export const CSRF_HEADER = "x-csrf-token";
/** Polling latar mengirim header ini agar `lastActivityAt` tidak diperbarui (api-specs 02 §2.4). */
export const BACKGROUND_HEADER = "x-background";

/** Server hanya menyimpan SHA-256 dari nilai cookie sesi dan token CSRF (technical-specs 07 §7.1). */
export function hashToken(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Header CSRF cocok dengan hash yang disimpan sesi, dibandingkan dalam waktu konstan (api-specs 02 §2.5). */
export function csrfMatches(stored: Buffer | null, header: string | string[] | undefined): boolean {
  if (!stored || typeof header !== "string" || header.length === 0) return false;
  const given = hashToken(header);
  return given.length === stored.length && timingSafeEqual(given, stored);
}
