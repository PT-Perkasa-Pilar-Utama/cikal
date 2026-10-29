import { AUDIT_MODULE_NAMES, type AuditEventType, auditEventTypeSchema } from "@cikal/contracts";
import type { SelectOption } from "../../components/ui/SelectField";

/** Pilihan "Event Type" (AC-14.06). */
export const EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  MASTER_DATA: "Master Data",
  APPLICATION_ACTION: "Application Action",
  AUTHENTICATION: "Authentication",
  DATA_ACCESS: "Data Access",
};

export const EVENT_TYPE_OPTIONS: SelectOption[] = auditEventTypeSchema.options.map((value) => ({
  value,
  label: EVENT_TYPE_LABELS[value],
}));

export const MODULE_OPTIONS: SelectOption[] = AUDIT_MODULE_NAMES.map((name) => ({ value: name, label: name }));

/** Kode aksi menjadi teks kolom "Action", contoh `LOGIN_FAILED` menjadi "Login Failed" (AC-14.02 "Approve"). */
export const actionLabel = (action: string): string =>
  action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
