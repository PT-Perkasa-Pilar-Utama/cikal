import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, numeric, text, unique, uuid } from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "../../../../platform/db/columns.js";
import { documentFiles } from "../../document/index.js";
import { application } from "./pg-schema.js";
import { applicationId, regionColumns, tenantId } from "./section-columns.js";

export type AddressType = "ID" | "RESIDENCE" | "CORRESPONDENCE";
export type DocumentVerificationStatus = "PENDING" | "MATCH" | "NOT_MATCH";

/**
 * APPLICATION_PERSONALS, technical-specs 06 §6.9. Field sensitif terenkripsi bersama versi kuncinya, NIK juga blind
 * index untuk Dedup (DM-08, technical-specs 07 §7.4.1).
 */
export const applicationPersonals = application.table(
  "application_personals",
  {
    applicationId: applicationId().primaryKey(),
    tenantId: tenantId(),
    fullName: text("full_name").notNull(),
    fullNameId: text("full_name_id").notNull(),
    placeOfBirth: text("place_of_birth"),
    dateOfBirth: date("date_of_birth"),
    gender: text("gender"),
    religion: text("religion"),
    nationality: text("nationality"),
    education: text("education"),
    marital: text("marital"),
    motherMaidenNameEnc: bytea("mother_maiden_name_enc"),
    motherMaidenNameKeyVersion: integer("mother_maiden_name_key_version"),
    idType: text("id_type").$type<"KTP">().notNull(),
    idCardNumberEnc: bytea("id_card_number_enc").notNull(),
    idCardNumberKeyVersion: integer("id_card_number_key_version").notNull(),
    idCardNumberBidx: bytea("id_card_number_bidx").notNull(),
    idIssuedDate: date("id_issued_date"),
    idExpiredDate: text("id_expired_date"),
    npwpNumberEnc: bytea("npwp_number_enc"),
    npwpNumberKeyVersion: integer("npwp_number_key_version"),
    kkNumberEnc: bytea("kk_number_enc"),
    kkNumberKeyVersion: integer("kk_number_key_version"),
    mobileNumber: text("mobile_number"),
    phoneNumber: text("phone_number"),
    email: text("email"),
    ...auditColumns(),
  },
  (table) => [
    check("application_personals_id_type_check", sql`${table.idType} in ('KTP')`),
    index("application_personals_id_card_number_bidx_idx").on(table.tenantId, table.idCardNumberBidx),
    // Pencarian nama pemohon cocok sebagian di Application Inquiry (technical-specs 06 §6.9, AC-83.01).
    index("application_personals_full_name_trgm").using("gin", table.fullName.op("gin_trgm_ops")),
    tenantIsolation(),
  ],
);

/** APPLICATION_ADDRESSES, technical-specs 06 §6.9: alamat KTP dan domisili pemohon. */
export const applicationAddresses = application.table(
  "application_addresses",
  {
    id: uuid("id").primaryKey(),
    applicationId: applicationId(),
    tenantId: tenantId(),
    addressType: text("address_type").$type<AddressType>().notNull(),
    address: text("address"),
    rt: text("rt"),
    rw: text("rw"),
    ...regionColumns(),
    sameAsId: boolean("same_as_id").notNull().default(false),
    ...auditColumns(),
  },
  (table) => [
    unique("application_addresses_application_type_unique").on(table.applicationId, table.addressType),
    check(
      "application_addresses_address_type_check",
      sql`${table.addressType} in ('ID', 'RESIDENCE', 'CORRESPONDENCE')`,
    ),
    tenantIsolation(),
  ],
);

/** APPLICATION_OCCUPATIONS, technical-specs 06 §6.9: pekerjaan pemohon dan data perusahaan. */
export const applicationOccupations = application.table(
  "application_occupations",
  {
    applicationId: applicationId().primaryKey(),
    tenantId: tenantId(),
    sourceOfIncome: text("source_of_income"),
    occupation: text("occupation"),
    industryOfProfession: text("industry_of_profession"),
    position: text("position"),
    tenureAtCurrentJob: numeric("tenure_at_current_job", { precision: 5, scale: 1 }),
    monthlyIncomeAllowance: numeric("monthly_income_allowance", { precision: 18, scale: 2 }),
    organization: text("organization"),
    previousEmployer: text("previous_employer"),
    pensionInstance: text("pension_instance"),
    companyName: text("company_name"),
    companyAddress: text("company_address"),
    ...regionColumns("company_"),
    companyPhoneNumber: text("company_phone_number"),
    ...auditColumns(),
  },
  (table) => [tenantIsolation()],
);

/** APPLICATION_EMERGENCY_CONTACTS, technical-specs 06 §6.9: kontak darurat dan alamatnya. */
export const applicationEmergencyContacts = application.table(
  "application_emergency_contacts",
  {
    applicationId: applicationId().primaryKey(),
    tenantId: tenantId(),
    contactName: text("contact_name"),
    relationToApplicant: text("relation_to_applicant"),
    mobileNumber: text("mobile_number"),
    homePhoneNumber: text("home_phone_number"),
    altPhoneNumber: text("alt_phone_number"),
    address: text("address"),
    rt: text("rt"),
    rw: text("rw"),
    ...regionColumns(),
    ...auditColumns(),
  },
  (table) => [tenantIsolation()],
);

/**
 * APPLICATION_DOCUMENTS, technical-specs 06 §6.9: file terunggah per slot checklist. Unggah ulang mengganti
 * `file_id` dan mengembalikan status verifikasi ke `PENDING` (AC-47.05).
 */
export const applicationDocuments = application.table(
  "application_documents",
  {
    id: uuid("id").primaryKey(),
    applicationId: applicationId(),
    tenantId: tenantId(),
    documentType: text("document_type").notNull(),
    fileId: uuid("file_id").references(() => documentFiles.id),
    verificationStatus: text("verification_status").$type<DocumentVerificationStatus>().notNull().default("PENDING"),
    verificationRemarks: text("verification_remarks"),
    ...auditColumns(),
  },
  (table) => [
    unique("application_documents_application_type_unique").on(table.applicationId, table.documentType),
    check(
      "application_documents_verification_status_check",
      sql`${table.verificationStatus} in ('PENDING', 'MATCH', 'NOT_MATCH')`,
    ),
    index("application_documents_file_id_idx").on(table.fileId),
    tenantIsolation(),
  ],
);
