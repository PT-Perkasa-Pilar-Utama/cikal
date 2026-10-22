import { sql } from "drizzle-orm";
import { check, index, inet, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../tenancy/index.js";
import { AUDIT_ACTIONS } from "../domain/audit-entry.js";

export const audit = pgSchema("audit");

/**
 * AUDIT_LOGS, technical-specs 06 §6.8. `user_id` tanpa foreign key karena skema `audit` dimigrasi sebelum `iam`.
 * Role aplikasi hanya punya `SELECT` dan `INSERT` (AD-03, `appendOnlyTables` di `audit.data.ts`).
 */
export const auditLogs = audit.table(
  "audit_logs",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    userId: uuid("user_id"),
    role: text("role"),
    module: text("module").notNull(),
    action: text("action").notNull(),
    recordId: text("record_id"),
    description: text("description"),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    ipAddress: inet("ip_address"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (table) => [
    check(
      "audit_logs_action_check",
      sql`${table.action} in (${sql.raw(AUDIT_ACTIONS.map((action) => `'${action}'`).join(", "))})`,
    ),
    index("audit_logs_tenant_module_occurred_at_idx").on(table.tenantId, table.module, table.occurredAt),
    tenantIsolation(),
  ],
);
