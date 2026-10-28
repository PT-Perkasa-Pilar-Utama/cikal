import type { ApprovalDecision, ApprovalType, InterestType } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../application/index.js";
import { users } from "../../identity/index.js";
import { branches } from "../../organization/index.js";
import { products } from "../../product/index.js";
import { companies } from "../../tenancy/index.js";

export const approval = pgSchema("approval");

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);
const branchId = () =>
  uuid("branch_id")
    .notNull()
    .references(() => branches.id);
const productId = () =>
  uuid("product_id")
    .notNull()
    .references(() => products.id);

/**
 * APPROVAL_LEVELS, technical-specs 06 §6.10: rentang nominal dan aksi tiap level cabang dan produk; 1 = tertinggi.
 * Di POC level hanya berasal dari seed (api-specs 16), jadi rentang tumpang tindih tidak terbentuk lewat aplikasi.
 */
export const levels = approval.table(
  "levels",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    branchId: branchId(),
    productId: productId(),
    jobLevel: integer("job_level").notNull(),
    description: text("description").notNull(),
    amountBegin: numeric("amount_begin", { precision: 18, scale: 2 }).notNull(),
    amountEnd: numeric("amount_end", { precision: 18, scale: 2 }).notNull(),
    isApprove: boolean("is_approve").notNull(),
    isReject: boolean("is_reject").notNull(),
    isReturn: boolean("is_return").notNull(),
    isCancel: boolean("is_cancel").notNull(),
    isFinalApprover: boolean("is_final_approver").notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("levels_branch_product_level_unique").on(table.branchId, table.productId, table.jobLevel),
    check("levels_job_level_check", sql`${table.jobLevel} >= 1`),
    check("levels_amount_check", sql`${table.amountEnd} > ${table.amountBegin}`),
    tenantIsolation(),
  ],
);

/**
 * APPROVAL_HIERARCHIES, technical-specs 06 §6.10: approver tiap level dan sub level, dan level berikutnya dalam
 * rantai (RM-06). Level wajib ada di Approval Level cabang dan produk yang sama (api-specs 16 §16.2).
 */
export const hierarchies = approval.table(
  "hierarchies",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    branchId: branchId(),
    productId: productId(),
    jobLevel: integer("job_level").notNull(),
    subLevel: integer("sub_level").notNull(),
    upLevel: integer("up_level"),
    upSubLevel: integer("up_sub_level"),
    approverUserId: uuid("approver_user_id")
      .notNull()
      .references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    foreignKey({
      name: "hierarchies_level_fk",
      columns: [table.branchId, table.productId, table.jobLevel],
      foreignColumns: [levels.branchId, levels.productId, levels.jobLevel],
    }),
    unique("hierarchies_assignment_unique").on(
      table.branchId,
      table.productId,
      table.jobLevel,
      table.subLevel,
      table.approverUserId,
    ),
    check("hierarchies_sub_level_check", sql`${table.subLevel} >= 1`),
    check("hierarchies_up_level_check", sql`(${table.upLevel} is null) = (${table.upSubLevel} is null)`),
    tenantIsolation(),
  ],
);

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const DECISIONS = ["PENDING", "APPROVE", "REJECT", "RETURN", "AUTO_APPROVED"] as const satisfies ApprovalDecision[];
const APPROVAL_TYPES = ["AUTO", "MANUAL"] as const satisfies ApprovalType[];
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));
const applicationId = () =>
  uuid("application_id")
    .notNull()
    .references(() => applications.id);
const money = (name: string) => numeric(name, { precision: 18, scale: 2 });
const percent = (name: string) => numeric(name, { precision: 9, scale: 4 });

/**
 * APPLICATION_APPROVALS, technical-specs 06 §6.10: rantai approval satu ProcessInstance berurutan dari level terendah
 * (RM-06), dibentuk sekali saat langkah APPROVAL berjalan. Auto approval satu baris `AUTO_APPROVED` tanpa level dan
 * approver (RM-05).
 */
export const applicationApprovals = approval.table(
  "application_approvals",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    applicationId: applicationId(),
    processInstanceId: uuid("process_instance_id").notNull(),
    sequence: integer("sequence").notNull(),
    jobLevel: integer("job_level"),
    subLevel: integer("sub_level"),
    description: text("description"),
    approverUserId: uuid("approver_user_id").references(() => users.id),
    decision: text("decision").$type<ApprovalDecision>().notNull(),
    comment: text("comment"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    unique("application_approvals_sequence_unique").on(table.processInstanceId, table.sequence),
    index("application_approvals_application_idx").on(table.applicationId),
    check("application_approvals_decision_check", sql`${table.decision} in (${textList(DECISIONS)})`),
    check(
      "application_approvals_level_check",
      sql`(${table.decision} = 'AUTO_APPROVED') = (${table.jobLevel} is null and ${table.approverUserId} is null)`,
    ),
    check("application_approvals_comment_check", sql`char_length(${table.comment}) <= 1000`),
    tenantIsolation(),
  ],
);

/**
 * FINANCINGS, technical-specs 06 §6.10: struktur kredit RM-07, RM-08 satu pengajuan saat disetujui. Persetujuan ulang
 * sesudah Recontest atau kembali ke Draft mengganti baris ini.
 */
export const financings = approval.table(
  "financings",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    applicationId: applicationId(),
    processInstanceId: uuid("process_instance_id").notNull(),
    approvalType: text("approval_type").$type<ApprovalType>().notNull(),
    loanAmount: money("loan_amount").notNull(),
    tenor: integer("tenor").notNull(),
    interestType: text("interest_type").$type<InterestType>().notNull(),
    interestRate: percent("interest_rate").notNull(),
    floatingRate: percent("floating_rate"),
    capRate: percent("cap_rate"),
    tenorFixed: integer("tenor_fixed"),
    adminFee: money("admin_fee").notNull(),
    salesFee: money("sales_fee"),
    provisionFee: money("provision_fee").notNull(),
    insuranceValue: money("insurance_value").notNull(),
    netDisbursement: money("net_disbursement").notNull(),
    monthlyInstallment: money("monthly_installment").notNull(),
    dbrRatio: percent("dbr_ratio"),
    dsrRatio: percent("dsr_ratio"),
    formulaVersions: jsonb("formula_versions").$type<Record<string, string>>().notNull(),
    firstInstallmentDate: date("first_installment_date").notNull(),
    /** Nomor SP3K produk kategori COLLATERAL (KPR), dibentuk saat level final menyetujui (AC-102.02). */
    sp3kNumber: text("sp3k_number"),
    ...auditColumns(),
  },
  (table) => [
    unique("financings_application_unique").on(table.applicationId),
    check("financings_approval_type_check", sql`${table.approvalType} in (${textList(APPROVAL_TYPES)})`),
    tenantIsolation(),
  ],
);

/** INSTALLMENTS, technical-specs 06 §6.10: jadwal angsuran; sisa pokok baris terakhir 0 (RM-19). */
export const installments = approval.table(
  "installments",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    financingId: uuid("financing_id")
      .notNull()
      .references(() => financings.id, { onDelete: "cascade" }),
    installmentNo: integer("installment_no").notNull(),
    dueDate: date("due_date").notNull(),
    principalAmount: money("principal_amount").notNull(),
    interestAmount: money("interest_amount").notNull(),
    outstandingAmount: money("outstanding_amount").notNull(),
    ...auditColumns(),
  },
  (table) => [unique("installments_number_unique").on(table.financingId, table.installmentNo), tenantIsolation()],
);
