import type { InterestType, ProductCategory } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, numeric, pgSchema, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../tenancy/index.js";

export const product = pgSchema("product");

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);
/** Uang `numeric(18,2)` dan persen `numeric(9,4)` (DM-06). */
const money = (name: string) => numeric(name, { precision: 18, scale: 2 });
const percent = (name: string) => numeric(name, { precision: 9, scale: 4 });

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const CATEGORIES = "'COLLATERAL', 'NON_COLLATERAL', 'PENSION', 'SYARIAH'";
const INTEREST_TYPES = "'FLAT', 'EFFECTIVE', 'FLOATING', 'HYBRID', 'CAPPED'";

/** PRODUCTS (UI label: "Master Product"), technical-specs 06 §6.7. */
export const products = product.table(
  "products",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    productCategory: text("product_category").$type<ProductCategory>().notNull(),
    interestType: text("interest_type").$type<InterestType>().notNull(),
    contractType: text("contract_type"),
    minPlafond: money("min_plafond").notNull(),
    maxPlafond: money("max_plafond").notNull(),
    minTenor: integer("min_tenor").notNull(),
    maxTenor: integer("max_tenor").notNull(),
    minAge: integer("min_age").notNull(),
    maxAge: integer("max_age").notNull(),
    maxAgeAtMaturityMonth: integer("max_age_at_maturity_month"),
    dbrMax: percent("dbr_max").notNull(),
    dsr: percent("dsr"),
    multipleSalaryDbr: percent("multiple_salary_dbr"),
    adminFee: money("admin_fee").notNull().default("0"),
    provisionFee: percent("provision_fee").notNull().default("0"),
    salesFee: money("sales_fee"),
    limitAutoApproval: money("limit_auto_approval").notNull().default("0"),
    scoringApproval: boolean("scoring_approval"),
    isPaylater: boolean("is_paylater"),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("products_tenant_product_code_unique").on(table.tenantId, sql`upper(${table.productCode})`),
    check("products_product_code_check", sql`${table.productCode} ~ '^[A-Za-z0-9]{1,5}$'`),
    check("products_product_name_check", sql`char_length(${table.productName}) <= 100`),
    check("products_product_category_check", sql`${table.productCategory} in (${sql.raw(CATEGORIES)})`),
    check("products_interest_type_check", sql`${table.interestType} in (${sql.raw(INTEREST_TYPES)})`),
    check("products_plafond_check", sql`${table.maxPlafond} > ${table.minPlafond}`),
    check("products_limit_auto_approval_check", sql`${table.limitAutoApproval} <= ${table.maxPlafond}`),
    check("products_valid_to_check", sql`${table.validTo} >= ${table.validFrom}`),
    tenantIsolation(),
  ],
);

/**
 * SUB_PRODUCTS, technical-specs 06 §6.7: suku bunga per periode berlaku. Periode tidak tumpang tindih dijaga
 * aturan domain saat diajukan dan disetujui (AC-97.02); pricing satu produk hanya diganti lewat satu
 * ChangeRequest terbuka, jadi tidak ada penulis bersamaan.
 */
export const subProducts = product.table(
  "sub_products",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    interestRate: percent("interest_rate").notNull(),
    floatingRate: percent("floating_rate"),
    capRate: percent("cap_rate"),
    tenorFixed: integer("tenor_fixed"),
    approverRateMin: percent("approver_rate_min"),
    approverRateMax: percent("approver_rate_max"),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    ...auditColumns(),
  },
  (table) => [
    index("sub_products_product_id_idx").on(table.productId, table.validFrom),
    check("sub_products_interest_rate_check", sql`${table.interestRate} > 0`),
    check("sub_products_approver_rate_min_check", sql`${table.approverRateMin} <= ${table.interestRate}`),
    check("sub_products_approver_rate_max_check", sql`${table.approverRateMax} >= ${table.interestRate}`),
    check("sub_products_valid_to_check", sql`${table.validTo} >= ${table.validFrom}`),
    tenantIsolation(),
  ],
);
