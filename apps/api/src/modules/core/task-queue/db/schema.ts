import type { QueueCode, TaskStatus } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { check, index, integer, pgSchema, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../application/index.js";
import { roles, users } from "../../identity/index.js";
import { stepExecutions } from "../../orchestrator/index.js";
import { companies } from "../../tenancy/index.js";

export const taskqueue = pgSchema("taskqueue");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const QUEUE_CODES = [
  "VERIFICATION",
  "CREDIT_REPORT_UPLOAD",
  "APPROVAL",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
  "PROCESS_ERROR",
  "PRESCREEN_DEDUP",
  "PRESCREEN_DUKCAPIL_L1",
  "PRESCREEN_FRAUD",
  "PRESCREEN_DUKCAPIL_L2",
  "RECONTEST",
] as const satisfies QueueCode[];
const TASK_STATUSES = ["OPEN", "ASSIGNED", "CLOSED"] as const satisfies TaskStatus[];
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

/**
 * HUMAN_TASKS, technical-specs 06 §6.10: satu tugas manusia per langkah yang menunggu. `application_id` dan
 * `loan_id` (tetap sejak draft pertama) disalin saat tugas dibuat agar antrean bisa dicari dan diurutkan tanpa
 * membaca skema `application` (XM-02). Foreign key `branch_id` ditambahkan saat tabel `org.branches` dibuat.
 */
export const humanTasks = taskqueue.table(
  "human_tasks",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    stepExecutionId: uuid("step_execution_id")
      .notNull()
      .references(() => stepExecutions.id),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    loanId: text("loan_id").notNull(),
    queueCode: text("queue_code").$type<QueueCode>().notNull(),
    branchId: uuid("branch_id"),
    eligibleRoleId: uuid("eligible_role_id").references(() => roles.id),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    status: text("status").$type<TaskStatus>().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id),
    resultCode: text("result_code"),
    version: integer("version").notNull().default(1),
    ...auditColumns(),
  },
  (table) => [
    index("human_tasks_queue_status_idx").on(table.queueCode, table.status, table.createdAt),
    // Satu tugas terbuka per attempt langkah: pembuatan ulang dari job yang diulang tidak menggandakan tugas.
    uniqueIndex("human_tasks_open_step_unique").on(table.stepExecutionId).where(sql`${table.status} <> 'CLOSED'`),
    check("human_tasks_queue_code_check", sql`${table.queueCode} in (${textList(QUEUE_CODES)})`),
    check("human_tasks_status_check", sql`${table.status} in (${textList(TASK_STATUSES)})`),
    check("human_tasks_assignee_check", sql`(${table.status} = 'OPEN') = (${table.assignedUserId} is null)`),
    check("human_tasks_closed_check", sql`(${table.status} = 'CLOSED') = (${table.closedAt} is not null)`),
    check("human_tasks_version_check", sql`${table.version} >= 1`),
    tenantIsolation(),
  ],
);
