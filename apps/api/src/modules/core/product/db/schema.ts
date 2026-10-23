import type { InterestType, ProductCategory, StepCode } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
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
export type RouteVersionStatus = "DRAFT" | "WAITING_APPROVAL" | "ACTIVE" | "SUPERSEDED";
const ROUTE_VERSION_STATUSES = [
  "DRAFT",
  "WAITING_APPROVAL",
  "ACTIVE",
  "SUPERSEDED",
] as const satisfies RouteVersionStatus[];
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

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

/** PRODUCT_ROUTES, technical-specs 06 §6.7: satu rute per produk (RT-01). */
export const productRoutes = product.table(
  "product_routes",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    ...auditColumns(),
  },
  (table) => [unique("product_routes_product_id_unique").on(table.productId), tenantIsolation()],
);

/**
 * PRODUCT_ROUTE_VERSIONS, technical-specs 06 §6.7. Data berversi DM-11: satu versi ACTIVE per rute. Versi yang
 * pernah ACTIVE tidak diubah lagi, jadi ProcessInstance yang menguncinya membaca langkah yang sama (RT-06).
 */
export const productRouteVersions = product.table(
  "product_route_versions",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => productRoutes.id),
    versionNumber: integer("version_number").notNull(),
    status: text("status").$type<RouteVersionStatus>().notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    unique("product_route_versions_route_version_unique").on(table.routeId, table.versionNumber),
    uniqueIndex("product_route_versions_active_unique").on(table.routeId).where(sql`${table.status} = 'ACTIVE'`),
    check("product_route_versions_status_check", sql`${table.status} in (${textList(ROUTE_VERSION_STATUSES)})`),
    check("product_route_versions_version_number_check", sql`${table.versionNumber} >= 1`),
    check(
      "product_route_versions_effective_from_check",
      sql`${table.status} <> 'ACTIVE' or ${table.effectiveFrom} is not null`,
    ),
    tenantIsolation(),
  ],
);

/** PRODUCT_ROUTE_STEPS, technical-specs 06 §6.7: langkah yang tampil di editor rute untuk satu versi. */
export const productRouteSteps = product.table(
  "product_route_steps",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => productRouteVersions.id),
    stepCode: text("step_code").$type<StepCode>().notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("product_route_steps_version_step_unique").on(table.versionId, table.stepCode),
    check("product_route_steps_step_code_check", sql`${table.stepCode} in (${textList(STEP_CODES)})`),
    tenantIsolation(),
  ],
);

/**
 * DOCUMENT_CHECKLISTS, technical-specs 06 §6.7: daftar dokumen per kombinasi produk, pekerjaan, dan status kawin
 * (`param_id` General Parameter). Satu baris per kombinasi, aktif atau tidak (AC-25.03).
 */
export const documentChecklists = product.table(
  "document_checklists",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    occupation: text("occupation").notNull(),
    marital: text("marital").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    unique("document_checklists_combination_unique").on(
      table.tenantId,
      table.productId,
      table.occupation,
      table.marital,
    ),
    tenantIsolation(),
  ],
);

/** DOCUMENT_CHECKLIST_ITEMS, technical-specs 06 §6.7: `document_type` adalah `param_id` ParamType Document. */
export const documentChecklistItems = product.table(
  "document_checklist_items",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    checklistId: uuid("checklist_id")
      .notNull()
      .references(() => documentChecklists.id),
    documentType: text("document_type").notNull(),
    isMandatory: boolean("is_mandatory").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    unique("document_checklist_items_document_unique").on(table.checklistId, table.documentType),
    tenantIsolation(),
  ],
);
