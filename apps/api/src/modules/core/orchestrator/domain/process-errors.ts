import { DomainError } from "../../../../platform/http/domain-error.js";

/** Kode error proses dan pesan persis AC (api-specs 13 §13.2, api-specs 12 §12.8). */
const PROCESS_ERRORS = {
  APPLICATION_NOT_FOUND: { status: 404, message: "Application not found" },
  PROCESS_NOT_STARTED: { status: 409, message: "Process has not started. Submit the application to start the process" },
  PRODUCT_NOT_AVAILABLE: { status: 422, message: "Selected product is not available" },
} as const satisfies Record<string, { status: number; message: string }>;

export type ProcessErrorCode = keyof typeof PROCESS_ERRORS;

export function processError(code: ProcessErrorCode): DomainError {
  return new DomainError(code, PROCESS_ERRORS[code].message, PROCESS_ERRORS[code].status);
}
