import type { ApplicationStatus, ProductCategory, StepCode } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { bigint, check, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { users } from "../../identity/index.js";
import { products } from "../../product/index.js";
import { companies } from "../../tenancy/index.js";

export const application = pgSchema("application");

export type ApplicationChannel = "WEB" | "MOBILE" | "API" | "UPLOAD";

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const STATUSES = [
  "DRAFT",
  "ON_PROGRESS",
  "RECONTEST",
  "APPROVED",
  "DISBURSED",
  "FINISHED_REJECTED",
  "FINISHED_CANCELLED",
] as const satisfies ApplicationStatus[];
const CHANNELS = ["WEB", "MOBILE", "API", "UPLOAD"] as const satisfies ApplicationChannel[];
const CATEGORIES = ["COLLATERAL", "NON_COLLATERAL", "PENSION", "SYARIAH"] as const satisfies ProductCategory[];
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

/**
 * APPLICATIONS, technical-specs 06 §6.9: kolom yang dipakai orchestrator (TL-S2-01). Kolom draft dan section
 * lain ditambahkan migrasi kartu BE-S3-01 dan BE-S3-02; `branch_id` menunggu tabel `org.branches`.
 */
export const applications = application.table(
  "applications",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    loanId: text("loan_id").notNull(),
    channel: text("channel").$type<ApplicationChannel>().notNull(),
    productCategory: text("product_category").$type<ProductCategory>().notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    status: text("status").$type<ApplicationStatus>().notNull().default("DRAFT"),
    currentStep: text("current_step").$type<StepCode>(),
    returnNote: text("return_note"),
    submittedBy: uuid("submitted_by").references(() => users.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    unique("applications_tenant_loan_id_unique").on(table.tenantId, table.loanId),
    check("applications_status_check", sql`${table.status} in (${textList(STATUSES)})`),
    check("applications_channel_check", sql`${table.channel} in (${textList(CHANNELS)})`),
    check("applications_product_category_check", sql`${table.productCategory} in (${textList(CATEGORIES)})`),
    check("applications_current_step_check", sql`${table.currentStep} in (${textList(STEP_CODES)})`),
    tenantIsolation(),
  ],
);

/**
 * LOAN_ID_COUNTERS, technical-specs 06 §6.9: nomor terakhir per produk per company, tidak direset harian
 * (TRM_LID_002 s.d. TRM_LID_004). Batas atas sama dengan `LOAN_ID_MAX_SEQUENCE` (TRM_LID_005).
 */
export const loanIdCounters = application.table(
  "loan_id_counters",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    productCode: text("product_code").notNull(),
    lastNumber: bigint("last_number", { mode: "number" }).notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("loan_id_counters_tenant_product_code_unique").on(table.tenantId, table.productCode),
    check("loan_id_counters_last_number_check", sql`${table.lastNumber} between 1 and 9999999`),
    tenantIsolation(),
  ],
);
