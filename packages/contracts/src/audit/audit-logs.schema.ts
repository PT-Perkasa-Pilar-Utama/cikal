import { z } from "zod";
import { dataEnvelope, pageEnvelope, pageQuerySchema } from "../common/envelope.js";
import { businessDate, id, timestamp } from "../common/scalars.js";

/** Pilihan "Event Type" halaman "Audit Trail" (api-specs 17 §17.2, AC-14.06). */
export const auditEventTypeSchema = z.enum(["MASTER_DATA", "APPLICATION_ACTION", "AUTHENTICATION", "DATA_ACCESS"]);
export type AuditEventType = z.infer<typeof auditEventTypeSchema>;

/**
 * Label modul yang dicatat jejak audit, untuk dropdown "Module" (AC-14.01). Sama dengan `AuditEvent.module` di
 * modul pencatat; modul baru yang mencatat audit menambah labelnya di sini.
 */
export const AUDIT_MODULE_NAMES = [
  "Authentication",
  "Role Access",
  "Product",
  "Product Route",
  "Document Checklist",
  "Approval Hierarchy",
  "Scoring Model",
  "Decision Matrix",
  "Document Number Format",
  "License",
  "Application",
  "Approval",
  "Task Queue",
  "Process Monitoring",
  "Document",
] as const;

/** Query `GET /audit-logs` (api-specs 17 §17.2); periode wajib dan maksimal 366 hari (AC-14.04). */
export const auditLogQuerySchema = pageQuerySchema.extend({
  occurredFrom: businessDate,
  occurredTo: businessDate,
  module: z.string().trim().min(1).max(50).optional(),
  eventType: auditEventTypeSchema.optional(),
  userId: id.optional(),
  recordId: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(["occurredAt,desc", "occurredAt,asc"]).default("occurredAt,desc"),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

/** Satu baris "Audit Trail"; `user` kosong untuk aksi sistem. */
export const auditLogItemSchema = z.object({
  id,
  occurredAt: timestamp,
  user: z.object({ username: z.string() }).nullable(),
  role: z.string().nullable(),
  module: z.string(),
  eventType: auditEventTypeSchema,
  action: z.string(),
  recordId: z.string().nullable(),
  description: z.string().nullable(),
  ipAddress: z.string().nullable(),
});
export type AuditLogItem = z.infer<typeof auditLogItemSchema>;

export const auditLogListResponseSchema = pageEnvelope(auditLogItemSchema);
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;

/**
 * Detail `GET /audit-logs/{id}` (api-specs 17 §17.3): data sebelum dan sesudah, dengan path bertitik field yang
 * berubah (AC-14.02). Array dibandingkan utuh.
 */
export const auditLogDetailSchema = auditLogItemSchema.extend({
  oldData: z.record(z.string(), z.unknown()).nullable(),
  newData: z.record(z.string(), z.unknown()).nullable(),
  changedFields: z.array(z.string()),
});
export type AuditLogDetail = z.infer<typeof auditLogDetailSchema>;

export const auditLogDetailResponseSchema = dataEnvelope(auditLogDetailSchema);
export type AuditLogDetailResponse = z.infer<typeof auditLogDetailResponseSchema>;
