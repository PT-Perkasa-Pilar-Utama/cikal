import { sql } from "drizzle-orm";
import { check, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const tenancy = pgSchema("tenancy");

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
