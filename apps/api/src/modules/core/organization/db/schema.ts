import { sql } from "drizzle-orm";
import { boolean, check, pgSchema, text, unique, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../tenancy/index.js";

export const org = pgSchema("org");

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

/** REGIONALS, technical-specs 06 §6.5. */
export const regionals = org.table(
  "regionals",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    regionalCode: text("regional_code").notNull(),
    regionalName: text("regional_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    unique("regionals_tenant_code_unique").on(table.tenantId, table.regionalCode),
    check("regionals_code_check", sql`${table.regionalCode} ~ '^[0-9]{2,3}$'`),
    tenantIsolation(),
  ],
);

/** BRANCHES, technical-specs 06 §6.5: kode unik per regional (AC-17.04). */
export const branches = org.table(
  "branches",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    regionalId: uuid("regional_id")
      .notNull()
      .references(() => regionals.id),
    branchCode: text("branch_code").notNull(),
    branchName: text("branch_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [unique("branches_regional_code_unique").on(table.regionalId, table.branchCode), tenantIsolation()],
);

/** SUB_BRANCHES, technical-specs 06 §6.5. */
export const subBranches = org.table(
  "sub_branches",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    subBranchCode: text("sub_branch_code").notNull(),
    subBranchName: text("sub_branch_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [unique("sub_branches_branch_code_unique").on(table.branchId, table.subBranchCode), tenantIsolation()],
);
