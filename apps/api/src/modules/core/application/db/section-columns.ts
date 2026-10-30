import { text, uuid } from "drizzle-orm/pg-core";
import { companies } from "../../tenancy/index.js";
import { applications } from "./schema.js";

/** Kolom kunci tabel section pengajuan: satu baris per pengajuan. */
export const applicationId = () =>
  uuid("application_id")
    .notNull()
    .references(() => applications.id);
export const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

/** Kolom wilayah api-specs 06 §6.3 dengan awalan nama, contoh `company_province_code`. */
export const regionColumns = (prefix = "") => ({
  provinceCode: text(`${prefix}province_code`),
  cityCode: text(`${prefix}city_code`),
  districtCode: text(`${prefix}district_code`),
  subDistrictCode: text(`${prefix}sub_district_code`),
  zipCode: text(`${prefix}zip_code`),
});
