import type { AdapterErrorCategory, IntegrationMode, ModuleCode } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../tenancy/index.js";

export const integration = pgSchema("integration");

export type ConfigStatus = "DRAFT" | "WAITING_APPROVAL" | "ACTIVE" | "SUPERSEDED";
export type CallDirection = "OUTBOUND" | "INBOUND";
export type CallStatus = "SUCCESS" | "ERROR";

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const MODES = ["SYNC", "ASYNC", "MANUAL"] as const satisfies IntegrationMode[];
const CONFIG_STATUSES = ["DRAFT", "WAITING_APPROVAL", "ACTIVE", "SUPERSEDED"] as const satisfies ConfigStatus[];
const DIRECTIONS = ["OUTBOUND", "INBOUND"] as const satisfies CallDirection[];
const CALL_STATUSES = ["SUCCESS", "ERROR"] as const satisfies CallStatus[];
const CATEGORIES = [
  "TIMEOUT",
  "CONNECTION",
  "PROVIDER_ERROR",
  "AUTH",
  "CONFIG",
  "INVALID_RESPONSE",
] as const satisfies AdapterErrorCategory[];
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

/**
 * INTEGRATION_CONFIGS, technical-specs 06 §6.10 dan data dictionary IntegrationConfig: penyedia aktif satu modul
 * per tenant, berversi (DM-11). Katalog adapter ada di kode (`domain/registry.ts`), jadi `provider_code` tidak
 * berupa foreign key. Di POC baris diisi seed (TASK_BREAKDOWN, Konfigurasi tanpa layar).
 */
export const integrationConfigs = integration.table(
  "integration_configs",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    moduleCode: text("module_code").$type<ModuleCode>().notNull(),
    providerCode: text("provider_code").notNull(),
    mode: text("mode").$type<IntegrationMode>().notNull(),
    endpointUrl: text("endpoint_url"),
    timeoutSeconds: integer("timeout_seconds").notNull().default(30),
    maxRetries: integer("max_retries").notNull().default(3),
    asyncWaitHours: integer("async_wait_hours"),
    resultReuseDays: integer("result_reuse_days").notNull().default(0),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    versionNumber: integer("version_number").notNull(),
    status: text("status").$type<ConfigStatus>().notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    // M14 memakai satu baris per penyedia asuransi (data dictionary IntegrationConfig).
    uniqueIndex("integration_configs_active_unique")
      .on(table.tenantId, table.moduleCode)
      .where(sql`${table.status} = 'ACTIVE' and ${table.moduleCode} <> 'M14'`),
    check("integration_configs_mode_check", sql`${table.mode} in (${textList(MODES)})`),
    check("integration_configs_status_check", sql`${table.status} in (${textList(CONFIG_STATUSES)})`),
    check("integration_configs_timeout_check", sql`${table.timeoutSeconds} between 1 and 120`),
    check("integration_configs_max_retries_check", sql`${table.maxRetries} between 0 and 5`),
    check("integration_configs_async_wait_check", sql`${table.asyncWaitHours} between 1 and 720`),
    check("integration_configs_reuse_days_check", sql`${table.resultReuseDays} between 0 and 90`),
    tenantIsolation(),
  ],
);

/**
 * INTEGRATION_CALL_LOGS, data dictionary IntegrationCallLog: satu baris per percobaan panggilan dengan PII
 * disamarkan (IN-06). Role aplikasi hanya boleh `SELECT` dan `INSERT` (`integration.data.ts`). Tabel dipartisi
 * bulanan per `started_at` lewat migrasi custom, jadi kunci primer memuat kolom partisi (technical-specs 06 §6.10).
 */
export const integrationCallLogs = integration.table(
  "integration_call_logs",
  {
    id: uuid("id").notNull(),
    tenantId: tenantId(),
    moduleCode: text("module_code").$type<ModuleCode>().notNull(),
    providerCode: text("provider_code"),
    direction: text("direction").$type<CallDirection>().notNull(),
    applicationId: uuid("application_id"),
    loanId: text("loan_id"),
    stepExecutionId: uuid("step_execution_id"),
    correlationId: text("correlation_id").notNull(),
    externalReference: text("external_reference"),
    attempt: integer("attempt").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    durationMs: integer("duration_ms").notNull(),
    status: text("status").$type<CallStatus>().notNull(),
    errorCategory: text("error_category").$type<AdapterErrorCategory>(),
    errorMessage: text("error_message"),
    requestMasked: jsonb("request_masked").notNull(),
    responseMasked: jsonb("response_masked"),
    ...auditColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.startedAt] }),
    index("integration_call_logs_application_idx").on(table.applicationId, table.startedAt),
    check("integration_call_logs_direction_check", sql`${table.direction} in (${textList(DIRECTIONS)})`),
    check("integration_call_logs_status_check", sql`${table.status} in (${textList(CALL_STATUSES)})`),
    check("integration_call_logs_category_check", sql`${table.errorCategory} in (${textList(CATEGORIES)})`),
    check("integration_call_logs_attempt_check", sql`${table.attempt} >= 1`),
    tenantIsolation(),
  ],
);
