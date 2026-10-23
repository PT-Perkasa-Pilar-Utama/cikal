import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  type ExtraConfigColumn,
  index,
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

/** GENERAL_PARAMETERS, technical-specs 06 §6.6: pilihan dropdown per `param_type` per company. */
export const generalParameters = masterdata.table(
  "general_parameters",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    paramType: text("param_type").notNull(),
    paramId: text("param_id").notNull(),
    paramValue: text("param_value").notNull(),
    biCode: text("bi_code"),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("general_parameters_param_id_unique").on(table.tenantId, table.paramType, table.paramId),
    uniqueIndex("general_parameters_param_value_unique").on(
      table.tenantId,
      table.paramType,
      sql`lower(${table.paramValue})`,
    ),
    check("general_parameters_param_value_check", sql`char_length(${table.paramValue}) <= 100`),
    tenantIsolation(),
  ],
);

/**
 * INSURANCES, technical-specs 06 §6.6: perusahaan asuransi per company untuk dropdown "Insurance" (api-specs 06
 * §6.2). `insurance_rates` dibuat bersama kartu yang menghitung premi.
 */
export const insurances = masterdata.table(
  "insurances",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    insuranceCode: text("insurance_code").notNull(),
    insuranceName: text("insurance_name").notNull(),
    providerCode: text("provider_code"),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("insurances_tenant_insurance_code_unique").on(table.tenantId, table.insuranceCode),
    tenantIsolation(),
  ],
);

/** Indeks `pg_trgm` untuk pencarian `ILIKE '%q%'` tanpa membedakan huruf besar dan kecil (AC-23.03). */
const trigram = (name: string, column: ExtraConfigColumn) => index(name).using("gin", column.op("gin_trgm_ops"));

/** PROVINCES [instalasi], technical-specs 06 §6.6: hasil sinkronisasi Oksara untuk semua company. */
export const provinces = masterdata.table(
  "provinces",
  {
    id: uuid("id").primaryKey(),
    provinceCode: text("province_code").notNull().unique(),
    provinceName: text("province_name").notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }).notNull(),
    ...auditColumns(),
  },
  (table) => [trigram("provinces_province_name_trgm", table.provinceName)],
);

/** CITIES [instalasi], technical-specs 06 §6.6. */
export const cities = masterdata.table(
  "cities",
  {
    id: uuid("id").primaryKey(),
    cityCode: text("city_code").notNull().unique(),
    cityName: text("city_name").notNull(),
    provinceCode: text("province_code")
      .notNull()
      .references(() => provinces.provinceCode),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }).notNull(),
    ...auditColumns(),
  },
  (table) => [
    index("cities_province_code_idx").on(table.provinceCode),
    trigram("cities_city_name_trgm", table.cityName),
  ],
);

/** DISTRICTS [instalasi], technical-specs 06 §6.6. */
export const districts = masterdata.table(
  "districts",
  {
    id: uuid("id").primaryKey(),
    districtCode: text("district_code").notNull().unique(),
    districtName: text("district_name").notNull(),
    cityCode: text("city_code")
      .notNull()
      .references(() => cities.cityCode),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }).notNull(),
    ...auditColumns(),
  },
  (table) => [
    index("districts_city_code_idx").on(table.cityCode),
    trigram("districts_district_name_trgm", table.districtName),
  ],
);

/** SUB_DISTRICTS [instalasi], technical-specs 06 §6.6. Oksara memberi satu kode pos per kelurahan. */
export const subDistricts = masterdata.table(
  "sub_districts",
  {
    id: uuid("id").primaryKey(),
    subDistrictCode: text("sub_district_code").notNull().unique(),
    subDistrictName: text("sub_district_name").notNull(),
    districtCode: text("district_code")
      .notNull()
      .references(() => districts.districtCode),
    zipCode: text("zip_code").notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }).notNull(),
    ...auditColumns(),
  },
  (table) => [
    index("sub_districts_district_code_idx").on(table.districtCode),
    trigram("sub_districts_sub_district_name_trgm", table.subDistrictName),
    trigram("sub_districts_zip_code_trgm", table.zipCode),
  ],
);

/**
 * REGION_SYNCS [instalasi], technical-specs 06 §6.6: satu baris per sinkronisasi (api-specs 06 §6.3.3).
 * `created_by` adalah Maker yang menekan "Sync Region Data". Satu sinkronisasi RUNNING per instalasi.
 */
export const regionSyncs = masterdata.table(
  "region_syncs",
  {
    id: uuid("id").primaryKey(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    addedCount: integer("added_count"),
    updatedCount: integer("updated_count"),
    errorCategory: text("error_category"),
    ...auditColumns(),
  },
  (table) => [
    check("region_syncs_status_check", sql`${table.status} in ('RUNNING', 'COMPLETED', 'FAILED')`),
    uniqueIndex("region_syncs_running_unique").on(table.status).where(sql`${table.status} = 'RUNNING'`),
    index("region_syncs_finished_at_idx").on(table.finishedAt).where(sql`${table.status} = 'COMPLETED'`),
  ],
);
