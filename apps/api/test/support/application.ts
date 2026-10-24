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

/** Tujuh dokumen wajib contoh AC-47.01; BPJS opsional seperti AC-47.06. */
export const SEVEN_MANDATORY_DOCUMENTS = [
  "KTP",
  "KK",
  "NPWP",
  "SLIP_GAJI",
  "REKENING_KORAN",
  "SURAT_KETERANGAN_KERJA",
  "PBB",
];

/**
 * Checklist aktif untuk produk, Occupation "001" Karyawan Swasta, dan Marital "001" Belum Kawin, seperti sudah
 * disetujui Checker (TL-S3-04).
 */
export async function insertChecklist(
  owner: pg.Pool,
  productId: string,
  items: ReadonlyArray<{ documentType: string; isMandatory: boolean }>,
  combination: { occupation: string; marital: string } = { occupation: "001", marital: "001" },
): Promise<string> {
  const checklistId = uuidv7();
  await owner.query(
    `insert into product.document_checklists (id, tenant_id, product_id, occupation, marital)
     values ($1, $2, $3, $4, $5)`,
    [checklistId, seedCompanyIds.company001, productId, combination.occupation, combination.marital],
  );
  for (const item of items) {
    await owner.query(
      `insert into product.document_checklist_items (id, tenant_id, checklist_id, document_type, is_mandatory)
       values ($1, $2, $3, $4, $5)`,
      [uuidv7(), seedCompanyIds.company001, checklistId, item.documentType, item.isMandatory],
    );
  }
  return checklistId;
}

/** Dokumen terunggah yang ditulis langsung lewat role pemilik skema, tanpa storage. */
export async function attachDocument(owner: pg.Pool, applicationId: string, documentType: string): Promise<void> {
  const fileId = uuidv7();
  await owner.query(
    `insert into document.document_files (id, tenant_id, file_name, original_extension, stored_format, size_bytes, storage_key)
     values ($1, $2, $3, 'pdf', 'PDF', 1024, $4)`,
    [fileId, seedCompanyIds.company001, `${documentType.toLowerCase()}.pdf`, `tenants/test/${fileId}`],
  );
  await owner.query(
    `insert into application.application_documents (id, tenant_id, application_id, document_type, file_id)
     values ($1, $2, $3, $4, $5)`,
    [uuidv7(), seedCompanyIds.company001, applicationId, documentType, fileId],
  );
}

/** Occupation karyawan swasta (AC-44.01) dan kontak darurat (AC-48.01) lengkap. */
export const occupationBody = {
  sourceOfIncome: "001",
  occupation: "001",
  industryOfProfession: "001",
  tenureAtCurrentJob: "4",
  monthlyIncomeAllowance: "8000000.00",
  company: {
    name: "PT Maju Jaya",
    address: "Jl. Asia Afrika 1",
    provinceCode: "32",
    cityCode: "32.73",
    districtCode: "32.73.01",
    subDistrictCode: "32.73.01.1001",
    zipCode: "40111",
    phoneNumber: "0221234567",
  },
};
export const emergencyContactBody = {
  contactName: "Dewi",
  mobileNumber: "081298765432",
  relationToApplicant: "002",
  address: { address: "Jl. Braga 5" },
};

/** Produk KTA dengan rute `steps` dan checklist tujuh dokumen wajib untuk Karyawan Swasta, Belum Kawin. */
export async function submittableProduct(
  owner: pg.Pool,
  steps: Record<string, boolean> = { ...MANDATORY_STEPS, DEDUP: true },
): Promise<string> {
  const productId = await insertProduct(owner, { productCode: nextProductCode("U") });
  await insertRoute(owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps }]);
  await insertChecklist(
    owner,
    productId,
    SEVEN_MANDATORY_DOCUMENTS.map((documentType) => ({ documentType, isMandatory: true })),
  );
  return productId;
}

/** Draft dengan semua section lengkap dan `documents` dokumen wajib terunggah, siap disubmit. */
export async function completeDraft(
  owner: pg.Pool,
  client: ReturnType<typeof sectionClient>,
  session: TestSession,
  productId: string,
  options: { documents?: readonly string[]; personal?: object } = {},
): Promise<string> {
  const id = await client.createDraft(session, productId);
  await client.save(session, id, "personal", personalBody(options.personal));
  await client.save(session, id, "occupation", occupationBody);
  await client.save(session, id, "emergency-contact", emergencyContactBody);
  for (const documentType of options.documents ?? SEVEN_MANDATORY_DOCUMENTS) {
    await attachDocument(owner, id, documentType);
  }
  return id;
}
