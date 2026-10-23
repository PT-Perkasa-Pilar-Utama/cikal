import type { ErrorCategory, ProcessStatus, SkipReason, StepCode, StepResultType, StepStatus } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../application/index.js";
import { productRouteVersions } from "../../product/index.js";
import { companies } from "../../tenancy/index.js";

export const orchestrator = pgSchema("orchestrator");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const PROCESS_STATUSES = ["RUNNING", "WAITING", "COMPLETED", "CANCELLED"] as const satisfies ProcessStatus[];
const STEP_STATUSES = [
  "PENDING",
  "RUNNING",
  "WAITING_HUMAN",
  "WAITING_EXTERNAL",
  "COMPLETED",
  "SKIPPED",
  "ERROR",
] as const satisfies StepStatus[];
const RESULT_TYPES = [
  "CONTINUE",
  "WAIT_HUMAN",
  "WAIT_EXTERNAL",
  "BACK_TO_DRAFT",
  "RECONTEST",
  "FINISH",
  "ERROR",
] as const satisfies StepResultType[];
const SKIP_REASONS = [
  "NOT_IN_ROUTE",
  "NOT_LICENSED",
  "CONDITION_NOT_MET",
  "DEDUP_MATCH",
] as const satisfies SkipReason[];
const ERROR_CATEGORIES = [
  "TIMEOUT",
  "CONNECTION",
  "PROVIDER_ERROR",
  "AUTH",
  "CONFIG",
  "INVALID_RESPONSE",
  "CONSENT_MISSING",
  "FORMULA",
  "BUSINESS_SETUP",
] as const satisfies ErrorCategory[];
const STEP_CODES = [
  "DATA_ENTRY",
  "SURVEY",
  "DEDUP",
  "DUKCAPIL",
  "NAME_SCREENING",
  "VERIFICATION",
  "FRAUD",
  "RAC",
  "SCORING",
  "CREDIT_BUREAU",
  "DECISION",
  "SIKP",
  "APPROVAL",
  "EPOLIS",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
  "WAIT_CORE",
] as const satisfies StepCode[];
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

/**
 * PROCESS_INSTANCES, technical-specs 06 §6.10: satu proses pengajuan dengan versi rute, versi rumus, dan parameter
 * yang dikunci saat submit (RT-06, FM-05, PR-06). Paling banyak satu proses berjalan per pengajuan. `loan_id` (tetap
 * sejak draft pertama) disalin saat proses dibuat agar Process Monitoring bisa dicari dan diurutkan tanpa membaca
 * skema `application` (XM-02).
 */
export const processInstances = orchestrator.table(
  "process_instances",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    loanId: text("loan_id").notNull(),
    recontestNumber: integer("recontest_number").notNull(),
    routeVersionId: uuid("route_version_id")
      .notNull()
      .references(() => productRouteVersions.id),
    formulaVersions: jsonb("formula_versions").$type<Record<string, string>>().notNull(),
    parameterSnapshot: jsonb("parameter_snapshot").$type<Record<string, string>>().notNull(),
    status: text("status").$type<ProcessStatus>().notNull(),
    recontestReason: text("recontest_reason"),
    /** Alasan Admin Operasional saat proses dihentikan dari Process Monitoring (AC-86.02). */
    finishReason: text("finish_reason"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    index("process_instances_application_id_idx").on(table.applicationId, table.startedAt),
    index("process_instances_status_idx").on(table.status),
    uniqueIndex("process_instances_active_unique")
      .on(table.applicationId)
      .where(sql`${table.status} in ('RUNNING', 'WAITING')`),
    check("process_instances_status_check", sql`${table.status} in (${textList(PROCESS_STATUSES)})`),
    check("process_instances_recontest_number_check", sql`${table.recontestNumber} >= 0`),
    tenantIsolation(),
  ],
);

/**
 * STEP_EXECUTIONS, technical-specs 06 §6.10: satu baris per langkah per attempt. Retry menambah baris dengan
 * attempt berikutnya; timeline menampilkan attempt terakhir.
 */
export const stepExecutions = orchestrator.table(
  "step_executions",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    processInstanceId: uuid("process_instance_id")
      .notNull()
      .references(() => processInstances.id),
    stepCode: text("step_code").$type<StepCode>().notNull(),
    status: text("status").$type<StepStatus>().notNull(),
    outcomeCode: text("outcome_code"),
    resultType: text("result_type").$type<StepResultType>(),
    externalReference: text("external_reference"),
    waitDeadline: timestamp("wait_deadline", { withTimezone: true }),
    errorCategory: text("error_category").$type<ErrorCategory>(),
    errorMessage: text("error_message"),
    reusedFromStepExecutionId: uuid("reused_from_step_execution_id").references((): AnyPgColumn => stepExecutions.id),
    skipReason: text("skip_reason").$type<SkipReason>(),
    attempt: integer("attempt").notNull(),
    actorUserId: uuid("actor_user_id"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    aging: numeric("aging", { precision: 10, scale: 2 }),
    summary: text("summary"),
    ...auditColumns(),
  },
  (table) => [
    unique("step_executions_process_step_attempt_unique").on(table.processInstanceId, table.stepCode, table.attempt),
    index("step_executions_external_reference_idx").on(table.externalReference),
    check("step_executions_step_code_check", sql`${table.stepCode} in (${textList(STEP_CODES)})`),
    check("step_executions_status_check", sql`${table.status} in (${textList(STEP_STATUSES)})`),
    check("step_executions_result_type_check", sql`${table.resultType} in (${textList(RESULT_TYPES)})`),
    check("step_executions_skip_reason_check", sql`${table.skipReason} in (${textList(SKIP_REASONS)})`),
    check("step_executions_error_category_check", sql`${table.errorCategory} in (${textList(ERROR_CATEGORIES)})`),
    check("step_executions_attempt_check", sql`${table.attempt} >= 1`),
    check(
      "step_executions_skipped_reason_check",
      sql`(${table.status} = 'SKIPPED') = (${table.skipReason} is not null)`,
    ),
    tenantIsolation(),
  ],
);
