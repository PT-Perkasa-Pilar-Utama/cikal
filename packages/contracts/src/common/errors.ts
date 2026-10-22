/** Kode error standar dan pesan bawaan (api-specs 01 §1.10). */
export const standardErrors = {
  VALIDATION_FAILED: { status: 400, message: "Please complete all required fields" },
  IDEMPOTENCY_KEY_REQUIRED: { status: 400, message: "Idempotency-Key header is required" },
  UNAUTHENTICATED: { status: 401, message: "Your session has expired. Please log in again" },
  SESSION_EXPIRED: { status: 401, message: "Your session has expired. Please log in again" },
  SESSION_REPLACED: { status: 401, message: "Your session was ended because you logged in from another browser" },
  CSRF_TOKEN_INVALID: { status: 403, message: "Your session has expired. Please log in again" },
  ACCESS_DENIED: { status: 403, message: "You do not have access to this page" },
  ACTION_DENIED: { status: 403, message: "You do not have permission to perform this action" },
  PASSWORD_CHANGE_REQUIRED: { status: 403, message: "Please change your initial password before continuing" },
  MODULE_NOT_LICENSED: { status: 403, message: "You do not have access to this page" },
  LICENSE_EXPIRED: { status: 403, message: "License has expired. The application is in read-only mode" },
  NOT_FOUND: { status: 404, message: "Data not found" },
  PENDING_CHANGE_REQUEST: { status: 409, message: "This data has a pending submission and cannot be edited" },
  ALREADY_PROCESSED: { status: 409, message: "This submission has already been processed" },
  INVALID_STATE: { status: 409, message: "This action is not allowed in the current status" },
  IDEMPOTENCY_KEY_REUSED: { status: 409, message: "Idempotency-Key was used with a different request" },
  FILE_TOO_LARGE: { status: 413, message: "File must not exceed 2 MB" },
  UNSUPPORTED_FILE_TYPE: { status: 415, message: "Allowed file types: png, jpg, jpeg, pdf, docx" },
  INVALID_DATE_RANGE: { status: 422, message: "End date must be on or after start date" },
  ACCOUNT_LOCKED: { status: 423, message: "Your account is locked for 15 minutes due to too many failed attempts" },
  RATE_LIMITED: { status: 429, message: "Too many requests. Please try again later" },
  NOT_IMPLEMENTED: { status: 501, message: "This operation is not implemented yet" },
  INTERNAL_ERROR: { status: 500, message: "An unexpected error occurred. Please try again" },
  SERVICE_UNAVAILABLE: { status: 503, message: "Service is temporarily unavailable" },
} as const satisfies Record<string, { status: number; message: string }>;

export type StandardErrorCode = keyof typeof standardErrors;
