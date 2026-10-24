import { sql } from "drizzle-orm";
import { check, pgSchema, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../application/index.js";
import { companies } from "../../tenancy/index.js";

export const notification = pgSchema("notification");

export type NotificationStatus = "SENT" | "FAILED" | "SKIPPED";

/**
 * EMAIL_TEMPLATES, technical-specs 06 §6.8: subjek dan isi email per company dengan placeholder `{{loanId}}`.
 * Layar ubah template di luar POC (api-specs 18 §18.2), jadi isinya dari seed.
 */
export const emailTemplates = notification.table(
  "email_templates",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    templateCode: text("template_code").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("email_templates_tenant_template_code_unique").on(table.tenantId, table.templateCode),
    tenantIsolation(),
  ],
);

/**
 * NOTIFICATION_LOGS, technical-specs 06 §6.8: satu baris per email per event. `event_id` menjaga handler idempotent
 * saat event outbox dikirim ulang (technical-specs 05 §5.0.1).
 */
export const notificationLogs = notification.table(
  "notification_logs",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    eventId: uuid("event_id").notNull(),
    applicationId: uuid("application_id").references(() => applications.id),
    templateCode: text("template_code").notNull(),
    recipient: text("recipient").notNull(),
    status: text("status").$type<NotificationStatus>().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("notification_logs_event_template_unique").on(table.tenantId, table.eventId, table.templateCode),
    check("notification_logs_status_check", sql`${table.status} in ('SENT', 'FAILED', 'SKIPPED')`),
    tenantIsolation(),
  ],
);
