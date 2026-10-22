import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { changeRequests } from "../../change-request/index.js";
import { products } from "../../product/index.js";
import { companies } from "../../tenancy/index.js";

export const masterdata = pgSchema("masterdata");

/** Uuid nol pengganti `product_id` kosong agar nilai tenant ikut dijaga indeks unik ACTIVE. */
const NO_PRODUCT = "00000000-0000-0000-0000-000000000000";

/** SYSTEM_PARAMETER_DEFINITIONS [instalasi], technical-specs 06 §6.6. Tenant tidak menambah baris (PR-01). */
export const systemParameterDefinitions = masterdata.table(
  "system_parameter_definitions",
  {
    id: uuid("id").primaryKey(),
    paramKey: text("param_key").notNull().unique(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    moduleCode: text("module_code").notNull(),
    category: text("category").notNull(),
    valueType: text("value_type").notNull(),
    allowedValues: jsonb("allowed_values"),
    minValue: numeric("min_value"),
    maxValue: numeric("max_value"),
    defaultValue: text("default_value"),
    scope: text("scope").notNull(),
    lockOnSubmit: boolean("lock_on_submit").notNull(),
    ...auditColumns(),
  },
  (table) => [
    check(
      "system_parameter_definitions_category_check",
      sql`${table.category} in ('BUSINESS', 'SECURITY', 'INTEGRATION', 'DISPLAY')`,
    ),
    check(
      "system_parameter_definitions_value_type_check",
      sql`${table.valueType} in ('NUMBER', 'MONEY', 'PERCENT', 'TEXT', 'BOOLEAN', 'CHOICE', 'MULTI_CHOICE', 'SECRET')`,
    ),
    check("system_parameter_definitions_scope_check", sql`${table.scope} in ('INSTALLATION', 'TENANT', 'PRODUCT')`),
  ],
);

/**
 * SYSTEM_PARAMETER_VALUES, technical-specs 06 §6.6. `change_request_id` kosong untuk nilai hasil seed; layar
 * parameter sistem di luar POC (grooming v2), jadi di POC semua nilai berasal dari seed.
 */
export const systemParameterValues = masterdata.table(
  "system_parameter_values",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => systemParameterDefinitions.id),
    productId: uuid("product_id").references(() => products.id),
    value: text("value"),
    // FK ke platform.secrets ditambahkan saat tabel itu dibuat (M02), seperti `companies.api_signing_key_ref`.
    secretRef: uuid("secret_ref"),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    changeRequestId: uuid("change_request_id").references(() => changeRequests.id),
    ...auditColumns(),
  },
  (table) => [
    check("system_parameter_values_status_check", sql`${table.status} in ('WAITING_APPROVAL', 'ACTIVE', 'SUPERSEDED')`),
    check("system_parameter_values_version_number_check", sql`${table.versionNumber} >= 1`),
    // Satu versi ACTIVE per parameter + produk (DM-11); nilai tenant memakai `product_id` kosong.
    uniqueIndex("system_parameter_values_active_unique")
      .on(table.tenantId, table.definitionId, sql`coalesce(${table.productId}, ${sql.raw(`'${NO_PRODUCT}'`)}::uuid)`)
      .where(sql`${table.status} = 'ACTIVE'`),
    tenantIsolation(),
  ],
);
