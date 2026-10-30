import type { CollateralType } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { check, date, index, integer, numeric, text } from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "../../../../platform/db/columns.js";
import { application } from "./pg-schema.js";
import { applicationId, regionColumns, tenantId } from "./section-columns.js";

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const COLLATERAL_TYPES = ["VEHICLE", "CERTIFICATE", "PENSION_DECREE"] as const satisfies CollateralType[];
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

/**
 * APPLICATION_SPOUSES, technical-specs 06 §6.9: data pasangan pemohon berstatus kawin (US-43). NIK pasangan
 * terenkripsi dan blind index (DM-08).
 */
export const applicationSpouses = application.table(
  "application_spouses",
  {
    applicationId: applicationId().primaryKey(),
    tenantId: tenantId(),
    fullName: text("full_name"),
    idNumberEnc: bytea("id_number_enc"),
    idNumberKeyVersion: integer("id_number_key_version"),
    idNumberBidx: bytea("id_number_bidx"),
    dateOfBirth: date("date_of_birth"),
    mobileNumber: text("mobile_number"),
    prenuptialAgreement: text("prenuptial_agreement"),
    idExpiredDate: text("id_expired_date"),
    idAddress: text("id_address"),
    idRt: text("id_rt"),
    idRw: text("id_rw"),
    ...regionColumns("id_"),
    occupation: text("occupation"),
    industryOfProfession: text("industry_of_profession"),
    position: text("position"),
    sourceOfFunds: text("source_of_funds"),
    monthlyIncome: numeric("monthly_income", { precision: 18, scale: 2 }),
    monthlySpending: numeric("monthly_spending", { precision: 18, scale: 2 }),
    companyName: text("company_name"),
    companyAddress: text("company_address"),
    companyProvinceCode: text("company_province_code"),
    companyCityCode: text("company_city_code"),
    companyPhoneNumber: text("company_phone_number"),
    ...auditColumns(),
  },
  (table) => [
    index("application_spouses_id_number_bidx_idx").on(table.tenantId, table.idNumberBidx),
    tenantIsolation(),
  ],
);

/** APPLICATION_BUSINESSES, technical-specs 06 §6.9: usaha pemohon wiraswasta (US-45). */
export const applicationBusinesses = application.table(
  "application_businesses",
  {
    applicationId: applicationId().primaryKey(),
    tenantId: tenantId(),
    businessName: text("business_name"),
    businessField: text("business_field"),
    phoneNumber: text("phone_number"),
    email: text("email"),
    annualSales: numeric("annual_sales", { precision: 18, scale: 2 }),
    businessNumber: text("business_number"),
    businessLaunchDate: date("business_launch_date"),
    characteristicOfFinancing: text("characteristic_of_financing"),
    typeOfFinancing: text("type_of_financing"),
    typeOfUsage: text("type_of_usage"),
    categoryOfFinancing: text("category_of_financing"),
    relationshipWithBank: text("relationship_with_bank"),
    address: text("address"),
    rt: text("rt"),
    rw: text("rw"),
    ...regionColumns(),
    ...auditColumns(),
  },
  (table) => [tenantIsolation()],
);

/** APPLICATION_COLLATERALS, technical-specs 06 §6.9: agunan pengajuan (US-46); nomor sertifikat terenkripsi. */
export const applicationCollaterals = application.table(
  "application_collaterals",
  {
    applicationId: applicationId().primaryKey(),
    tenantId: tenantId(),
    collateralType: text("collateral_type").$type<CollateralType>(),
    vehicleType: text("vehicle_type"),
    vehicleBrand: text("vehicle_brand"),
    vehicleModel: text("vehicle_model"),
    description: text("description"),
    vehicleYear: integer("vehicle_year"),
    vehiclePrice: numeric("vehicle_price", { precision: 18, scale: 2 }),
    vehicleColor: text("vehicle_color"),
    machineNumber: text("machine_number"),
    frameNumber: text("frame_number"),
    bpkbNumber: text("bpkb_number"),
    bpkbOwnerOccupation: text("bpkb_owner_occupation"),
    policeNumber: text("police_number"),
    certificateType: text("certificate_type"),
    certificateNumberEnc: bytea("certificate_number_enc"),
    certificateNumberKeyVersion: integer("certificate_number_key_version"),
    surfaceArea: numeric("surface_area", { precision: 12, scale: 2 }),
    decreeNumber: text("decree_number"),
    decreeDate: date("decree_date"),
    address: text("address"),
    rt: text("rt"),
    rw: text("rw"),
    ...regionColumns(),
    ...auditColumns(),
  },
  (table) => [
    check(
      "application_collaterals_collateral_type_check",
      sql`${table.collateralType} in (${textList(COLLATERAL_TYPES)})`,
    ),
    tenantIsolation(),
  ],
);
