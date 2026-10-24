import { sql } from "drizzle-orm";
import { check, index, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../tenancy/index.js";

export const calculation = pgSchema("calculation");

export type ExecutionStatus = "SUCCESS" | "ERROR";

/**
 * FORMULA_EXECUTION_LOGS, data dictionary FormulaExecutionLog (FM-08): satu baris per evaluasi rumus.
 * `formula_version_id` kosong berarti rumus default bawaan (FM-04); foreign key ke `formula_versions` dipasang
 * bersama tabel itu (api-specs 09 §9.3). Role aplikasi hanya boleh `SELECT` dan `INSERT` (`calculation.data.ts`).
 */
export const formulaExecutionLogs = calculation.table(
  "formula_execution_logs",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    formulaCode: text("formula_code").notNull(),
    formulaVersionId: uuid("formula_version_id"),
    applicationId: uuid("application_id"),
    processInstanceId: uuid("process_instance_id"),
    inputValues: jsonb("input_values").$type<Record<string, string | boolean>>().notNull(),
    result: text("result"),
    status: text("status").$type<ExecutionStatus>().notNull(),
    errorMessage: text("error_message"),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    ...auditColumns(),
  },
  (table) => [
    index("formula_execution_logs_application_idx").on(table.applicationId, table.executedAt),
    check("formula_execution_logs_status_check", sql`${table.status} in ('SUCCESS', 'ERROR')`),
    tenantIsolation(),
  ],
);
