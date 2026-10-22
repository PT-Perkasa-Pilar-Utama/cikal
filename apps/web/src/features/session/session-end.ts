import { ApiError } from "../../lib/api/client";

/** Kode 401 yang berarti sesi web berakhir (api-specs 02 §2.4); `INVALID_CREDENTIALS` dari login tidak termasuk. */
const SESSION_ENDED_CODES: ReadonlySet<string> = new Set(["UNAUTHENTICATED", "SESSION_EXPIRED", "SESSION_REPLACED"]);

/**
 * Pesan untuk halaman "Login" bila error berarti sesi sudah berakhir, selain itu `undefined`.
 * Klien menampilkan `message` dari respons apa adanya (api-specs 02 §2.1; AC-06.02, AC-06.03, AC-06.05).
 */
export function sessionEndedMessage(error: unknown): string | undefined {
  if (error instanceof ApiError && error.status === 401 && SESSION_ENDED_CODES.has(error.envelope.code)) {
    return error.message;
  }
  return undefined;
}
