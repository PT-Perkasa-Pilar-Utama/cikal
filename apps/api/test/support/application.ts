import { applicationDraftResponseSchema, type ProductCategory, sectionSaveResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { expect } from "vitest";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";
import { businessDate } from "../../src/platform/clock/business-date.js";
import { insertRoute } from "./process.js";
import { insertProduct, nextProductCode } from "./product.js";
import { MANDATORY_STEPS } from "./route.js";
import type { TestSession } from "./session.js";

export const NIK = "3273011402900001";
export const APPLICANT_MOBILE = "081234567890";
export const KTP_ADDRESS = {
  address: "Jl. Merdeka No. 10",
  rt: "001",
  rw: "002",
  provinceCode: "32",
  cityCode: "32.73",
  districtCode: "32.73.01",
  subDistrictCode: "32.73.01.1001",
  zipCode: "40111",
};

/** Produk tersedia dengan rute ACTIVE: plafon 5 s.d. 300 juta, tenor 6 s.d. 60, usia 21 s.d. 55 (AC-39.03). */
export async function availableProduct(
  owner: pg.Pool,
  options: { productCategory?: ProductCategory; maxAgeAtMaturityMonth?: number; prefix?: string } = {},
): Promise<string> {
  const productId = await insertProduct(owner, {
    productCode: nextProductCode(options.prefix ?? "S"),
    productCategory: options.productCategory ?? "NON_COLLATERAL",
  });
  await insertRoute(owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: MANDATORY_STEPS }]);
  if (options.maxAgeAtMaturityMonth !== undefined) {
    await owner.query("update product.products set max_age_at_maturity_month = $2 where id = $1", [
      productId,
      options.maxAgeAtMaturityMonth,
    ]);
  }
  return productId;
}

/** Nilai parameter sistem company 001 hasil persetujuan, untuk produk tertentu atau tenant. */
export async function setSystemParameter(
  owner: pg.Pool,
  paramKey: string,
  value: string,
  productId: string | null = null,
): Promise<void> {
  await owner.query(
    `insert into masterdata.system_parameter_values
       (id, tenant_id, definition_id, product_id, value, version_number, status, effective_from)
     select $1, $2, id, $3, $4, 1, 'ACTIVE', now() - interval '1 day'
       from masterdata.system_parameter_definitions where param_key = $5`,
    [uuidv7(), seedCompanyIds.company001, productId, value, paramKey],
  );
}

/** Tanggal lahir agar usia pemohon tepat `years` tahun hari ini (zona Asia/Jakarta). */
export function birthDateForAge(years: number, extraDays = 0): string {
  const [year = 0, month = 0, day = 0] = businessDate(new Date()).split("-").map(Number);
  const date = new Date(Date.UTC(year - years, month - 1, day + extraDays));
  return date.toISOString().slice(0, 10);
}

/** Klien draft dan simpan section untuk satu app uji. */
export function sectionClient(app: NestFastifyApplication) {
  const createDraft = async (session: TestSession, productId: string, application: object = {}) => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: session.headers,
      payload: {
        application: {
          applicationType: "NTB",
          productCategory: "NON_COLLATERAL",
          productId,
          segment: "MIKRO",
          tenorProposed: 36,
          requestedLimit: "20000000.00",
          ...application,
        },
        personal: { idType: "KTP", idCardNumber: NIK, fullName: "Rudi Hartono", fullNameId: "RUDI HARTONO" },
      },
    });
    expect(res.statusCode, res.body).toBe(201);
    return applicationDraftResponseSchema.parse(res.json()).data.id;
  };
  const put = (session: TestSession, id: string, section: string, payload: object, strict = true) =>
    app.inject({
      method: "PUT",
      url: `/api/v1/applications/${id}/sections/${section}?strict=${strict}`,
      headers: session.headers,
      payload,
    });
  const save = async (session: TestSession, id: string, section: string, payload: object, strict = true) => {
    const res = await put(session, id, section, payload, strict);
    expect(res.statusCode, res.body).toBe(200);
    return sectionSaveResponseSchema.parse(res.json());
  };
  return { createDraft, put, save };
}

/** Data pribadi lengkap AC-40.01 untuk pemohon `age` tahun. */
export const personalBody = (overrides: object = {}, age = 36) => ({
  fullName: "Rudi Hartono",
  fullNameId: "RUDI HARTONO",
  placeOfBirth: "Bandung",
  dateOfBirth: birthDateForAge(age),
  gender: "L",
  religion: "ISLAM",
  nationality: "WNI",
  education: "S1",
  marital: "001",
  motherMaidenName: "Siti",
  idType: "KTP",
  idCardNumber: NIK,
  idIssuedDate: "2020-01-10",
  mobileNumber: APPLICANT_MOBILE,
  addresses: { id: KTP_ADDRESS, residence: { sameAsId: true } },
  consentGiven: true,
  ...overrides,
});
