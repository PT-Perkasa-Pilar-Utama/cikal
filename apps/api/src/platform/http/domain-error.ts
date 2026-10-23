import { type StandardErrorCode, standardErrors } from "@cikal/contracts";

export interface ErrorDetail {
  field: string;
  code: string;
  message: string;
  /** Section form pengajuan yang ditandai error di stepper (api-specs 12 §12.8 langkah 2). */
  section?: string;
}

/**
 * Error bisnis dengan `code` bahasa Inggris dan `message` persis teks AC (technical-specs 05, api-specs 01 §1.5).
 * Lapisan HTTP memetakannya ke envelope error.
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "DomainError";
  }

  /** Error standar dengan pesan bawaan; `message` diisi bila AC menetapkan teks lain. */
  static standard(code: StandardErrorCode, message?: string, details: ErrorDetail[] = []): DomainError {
    const known = standardErrors[code];
    return new DomainError(code, message ?? known.message, known.status, details);
  }
}
