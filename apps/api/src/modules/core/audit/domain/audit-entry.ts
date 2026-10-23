/**
 * Daftar `AuditLog.action` (data dictionary; grooming v2 R-18 menambah `VIEW_APPLICATION`, api-specs 17 §17.2
 * `LOGOUT`, api-specs 04 §4.2 `LICENSE_INSTALLED`).
 */
export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "REVISE",
  "RESUBMIT",
  "ASSIGN",
  "RELEASE",
  "PRINT",
  "REPRINT",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "VIEW_APPLICATION",
  "LICENSE_INSTALLED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Satu kejadian jejak audit; pelaku dan IP berasal dari `Actor` pemanggil. */
export interface AuditEvent {
  /** Label modul pada halaman "Audit Trail", contoh `Product` atau `Authentication` (AC-14.01). */
  module: string;
  action: AuditAction;
  recordId?: string | null;
  description?: string | null;
  /** Tanpa nilai SECRET (PR-12). */
  oldData?: unknown;
  newData?: unknown;
}
