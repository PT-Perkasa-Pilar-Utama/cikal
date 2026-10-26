import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, integer, numeric, pgSchema, text, unique, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
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
