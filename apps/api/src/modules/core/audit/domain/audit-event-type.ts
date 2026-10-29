import type { AuditEventType } from "@cikal/contracts";
import type { AuditAction } from "./audit-entry.js";

/** Login berhasil, login gagal, dan logout (AC-14.06). */
export const AUTHENTICATION_ACTIONS: readonly AuditAction[] = ["LOGIN", "LOGIN_FAILED", "LOGOUT"];

/** Pembacaan data pengajuan dan berkas (grooming v2 R-18, api-specs 10 §10.1). */
export const DATA_ACCESS_ACTIONS: readonly AuditAction[] = ["VIEW_APPLICATION", "VIEW_DOCUMENT"];

/** Modul pencatat aksi atas pengajuan; aksi modul lain adalah perubahan data master atau konfigurasi. */
export const APPLICATION_MODULES: readonly string[] = [
  "Application",
  "Approval",
  "Task Queue",
  "Process Monitoring",
  "Document",
];

/**
 * Jenis kejadian "Event Type" (api-specs 17 §17.2) diturunkan dari aksi dan modul, sehingga baris lama tidak perlu
 * diisi ulang. Urutan aturan sama dengan saringan di `AuditLogsRepository`.
 */
export function auditEventType(module: string, action: string): AuditEventType {
  if (AUTHENTICATION_ACTIONS.some((candidate) => candidate === action)) return "AUTHENTICATION";
  if (DATA_ACCESS_ACTIONS.some((candidate) => candidate === action)) return "DATA_ACCESS";
  return APPLICATION_MODULES.includes(module) ? "APPLICATION_ACTION" : "MASTER_DATA";
}
