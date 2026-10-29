import type { ValidityStatus } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { check, date, integer, numeric, pgSchema, text, unique, uuid } from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../../core/application/index.js";
import { documentFiles, generatedDocuments } from "../../../core/document/index.js";
import { users } from "../../../core/identity/index.js";
import { companies } from "../../../core/tenancy/index.js";

export const m15Disbursement = pgSchema("m15_disbursement");

/**
 * DISBURSEMENTS, technical-specs 06 §6.11 M15: data pencairan satu pengajuan, dibuat saat langkah VALIDITY_CHECK
 * dimulai. Tanggal pencairan diisi saat Valid; rekening nasabah diisi Print Akad (keputusan TL 2026-10-28).
 */
export const disbursements = m15Disbursement.table(
  "disbursements",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    processInstanceId: uuid("process_instance_id").notNull(),
    disbursementAmount: numeric("disbursement_amount", { precision: 18, scale: 2 }).notNull(),
    bankAccountNumberEnc: bytea("bank_account_number_enc"),
    bankAccountNumberKeyVersion: integer("bank_account_number_key_version"),
    disbursementDate: date("disbursement_date"),
    validityStatus: text("validity_status").$type<ValidityStatus>(),
    notValidReason: text("not_valid_reason"),
    contractNumber: text("contract_number"),
    contractDate: date("contract_date"),
    ...auditColumns(),
  },
  (table) => [
    unique("disbursements_application_unique").on(table.applicationId),
    check("disbursements_validity_status_check", sql`${table.validityStatus} in ('VALID', 'NOT_VALID')`),
    check(
      "disbursements_valid_date_check",
      sql`${table.validityStatus} is distinct from 'VALID' or ${table.disbursementDate} is not null`,
    ),
    check(
      "disbursements_not_valid_reason_check",
      sql`${table.validityStatus} is distinct from 'NOT_VALID' or ${table.notValidReason} is not null`,
    ),
    tenantIsolation(),
  ],
);

/**
 * AKAD_PRINTS, technical-specs 06 §6.11 M15: isian form Print Akad dan dokumen akad terakhir satu pengajuan
 * (api-specs 25 §25.3). Cetak ulang menambah `print_count` (api-specs 25 §25.5).
 */
export const akadPrints = m15Disbursement.table(
  "akad_prints",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    paymentMethod: text("payment_method").notNull(),
    bankAccountNumber: text("bank_account_number").notNull(),
    customerAccountNumberEnc: bytea("customer_account_number_enc").notNull(),
    customerAccountNumberKeyVersion: integer("customer_account_number_key_version").notNull(),
    riskManagerUserId: uuid("risk_manager_user_id")
      .notNull()
      .references(() => users.id),
    generatedDocumentId: uuid("generated_document_id")
      .notNull()
      .references(() => generatedDocuments.id),
    fileId: uuid("file_id")
      .notNull()
      .references(() => documentFiles.id),
    printCount: integer("print_count").notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("akad_prints_application_unique").on(table.applicationId),
    check("akad_prints_print_count_check", sql`${table.printCount} >= 1`),
    tenantIsolation(),
  ],
);
