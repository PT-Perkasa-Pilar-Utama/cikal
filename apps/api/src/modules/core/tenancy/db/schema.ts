import type { DeploymentType, ModuleCode } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { check, date, integer, jsonb, pgSchema, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "../../../../platform/db/columns.js";

export const tenancy = pgSchema("tenancy");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const DEPLOYMENT_TYPES = ["SAAS", "ON_PREMISE"] as const satisfies DeploymentType[];
const MODULE_CODES = [
  "CORE",
  "M01",
  "M02",
  "M03",
  "M04",
  "M05",
  "M06",
  "M07",
  "M08",
  "M09",
  "M10",
  "M11",
  "M12",
  "M13",
  "M14",
  "M15",
  "M16",
] as const satisfies ModuleCode[];
/** `EXPIRED` tidak disimpan: dihitung dari `valid_to` saat dibaca (technical-specs 07 §7.6). */
export type StoredLicenseStatus = "ACTIVE" | "REVOKED";
const LICENSE_STATUSES = ["ACTIVE", "REVOKED"] as const satisfies StoredLicenseStatus[];
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

/**
 * COMPANIES (UI label: "Company"), technical-specs 06. `id` menjadi `tenant_id` bagi tabel lain. Diekspor lewat
 * `index.ts` hanya untuk foreign key `tenant_id` (XM-05); modul lain tidak membaca tabel ini (XM-02).
 */
export const companies = tenancy.table(
  "companies",
  {
    id: uuid("id").primaryKey(),
    companyCode: text("company_code").notNull().unique(),
    companyName: text("company_name").notNull(),
    platformCode: text("platform_code").notNull().default("01"),
    address: text("address").notNull(),
    ssoConfig: jsonb("sso_config"),
    // FK ke platform.secrets ditambahkan saat tabel itu dibuat (M02).
    apiSigningKeyRef: uuid("api_signing_key_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [
    check("companies_company_code_check", sql`${table.companyCode} ~ '^[0-9]{3}$'`),
    check("companies_company_name_check", sql`char_length(${table.companyName}) <= 100`),
    check("companies_platform_code_check", sql`${table.platformCode} in ('01', '02')`),
    check("companies_address_check", sql`char_length(${table.address}) <= 500`),
  ],
);

/**
 * LICENSES, technical-specs 06 §6.5. Satu lisensi `ACTIVE` per company. `raw_document` dan `signature` diverifikasi
 * ulang setiap kali lisensi dimuat, sehingga baris yang diubah langsung di database tidak berlaku (LC-03).
 */
export const licenses = tenancy.table(
  "licenses",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    licenseNumber: text("license_number").notNull().unique(),
    deploymentType: text("deployment_type").$type<DeploymentType>().notNull(),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    maxUsers: integer("max_users"),
    signature: bytea("signature").notNull(),
    rawDocument: jsonb("raw_document").notNull(),
    status: text("status").$type<StoredLicenseStatus>().notNull(),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("licenses_active_unique").on(table.tenantId).where(sql`${table.status} = 'ACTIVE'`),
    check("licenses_deployment_type_check", sql`${table.deploymentType} in (${textList(DEPLOYMENT_TYPES)})`),
    check("licenses_status_check", sql`${table.status} in (${textList(LICENSE_STATUSES)})`),
    check("licenses_valid_range_check", sql`${table.validFrom} <= ${table.validTo}`),
    tenantIsolation(),
  ],
);

/** MODULE_ENTITLEMENTS, technical-specs 06 §6.5: modul lisensi untuk laporan; hak pakai dibaca dari dokumen terverifikasi. */
export const moduleEntitlements = tenancy.table(
  "module_entitlements",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id),
    moduleCode: text("module_code").$type<ModuleCode>().notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("module_entitlements_license_module_unique").on(table.licenseId, table.moduleCode),
    check("module_entitlements_module_code_check", sql`${table.moduleCode} in (${textList(MODULE_CODES)})`),
    tenantIsolation(),
  ],
);
