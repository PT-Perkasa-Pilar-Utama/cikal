import { applicationFormResponseSchema, errorEnvelopeSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { businessDate } from "../src/platform/clock/business-date.js";
import {
  availableProduct,
  completeDraft,
  NIK,
  occupationBody,
  personalBody,
  sectionClient,
  setSystemParameter,
  submittableProduct,
} from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { expectError } from "./support/route.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const KAWIN = "002";
const CERAI_HIDUP = "003";
const WIRASWASTA = "005";
const ADDRESS = {
  address: "Jl. Pasar Baru 7",
  provinceCode: "32",
  cityCode: "32.73",
  districtCode: "32.73.01",
  subDistrictCode: "32.73.01.1001",
  zipCode: "40111",
};

/** Pasangan karyawan swasta berpenghasilan 6 juta tanpa perjanjian pranikah (AC-43.01). */
const spouseBody = (overrides: object = {}) => ({
  fullName: "Sri Wahyuni",
  idNumber: "3273015506920002",
  dateOfBirth: "1992-06-15",
  prenuptialAgreement: "N",
  occupation: "001",
  monthlyIncome: "6000000.00",
  ...overrides,
});
/** Toko Sumber Rejeki di perdagangan eceran sejak 2018 (AC-45.01). */
const businessBody = (overrides: object = {}) => ({
  businessName: "Toko Sumber Rejeki",
  businessField: "001",
  annualSales: "600000000.00",
  businessLaunchDate: "2018-03-01",
  address: ADDRESS,
  ...overrides,
});
const selfEmployed = { ...occupationBody, sourceOfIncome: "002", occupation: WIRASWASTA, company: {} };

/** Tanggal `months` bulan dan `days` hari dari hari ini (zona Asia/Jakarta). */
function dateFromToday(months: number, days = 0): string {
  const [year = 0, month = 0, day = 0] = businessDate(new Date()).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day + days)).toISOString().slice(0, 10);
}

/**
 * Section Spouse dan Business (api-specs 12 §12.1, §12.3; AC-43.01 s.d. AC-43.04, AC-45.01 s.d. AC-45.05, AC-50.06).
 * Seed `dev`: Marital "002" Kawin, "003" Cerai Hidup; Occupation "005" Wiraswasta.
 */
describe("spouse and business sections", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let productId: string;
  let client: ReturnType<typeof sectionClient>;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const role = await createRole(db.owner, "Sales Pasangan", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    productId = await availableProduct(db.owner);
    client = sectionClient(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const form = async (id: string) => {
    const res = await app.inject({ method: "GET", url: `/api/v1/applications/${id}/form`, headers: sales.headers });
    expect(res.statusCode, res.body).toBe(200);
    return applicationFormResponseSchema.parse(res.json()).data;
  };
  const draftWithApplicant = async (marital: string, product = productId) => {
    const id = await client.createDraft(sales, product);
    await client.save(sales, id, "personal", personalBody({ marital }));
    return id;
  };

  it("AC-43.01 saves married applicant spouse data and moves to Occupation", async () => {
    const id = await draftWithApplicant(KAWIN);

    const res = await client.save(sales, id, "spouse", spouseBody());

    expect(res.data).toMatchObject({ savedSection: "spouse", nextSection: "occupation" });
    expect((await form(id)).sections.spouse).toMatchObject({
      fullName: "Sri Wahyuni",
      idNumber: "3273015506920002",
      monthlyIncome: "6000000.00",
    });
    const { rows } = await db.owner.query(
      "select id_number_enc is not null as encrypted, id_number_bidx is not null as indexed from application.application_spouses where application_id = $1",
      [id],
    );
    expect(rows[0]).toEqual({ encrypted: true, indexed: true });
  });

  it("AC-43.02 rejects a spouse ID number equal to the applicant ID number (SPOUSE_ID_SAME_AS_APPLICANT)", async () => {
    const id = await draftWithApplicant(KAWIN);

    expectError(
      await client.put(sales, id, "spouse", spouseBody({ idNumber: NIK })),
      422,
      "SPOUSE_ID_SAME_AS_APPLICANT",
      "Spouse ID number must be different from applicant ID number",
    );
  });

  it("AC-43.03 skips Spouse for a Cerai Hidup applicant (NOT_FOUND)", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.save(sales, id, "personal", personalBody({ marital: CERAI_HIDUP }));

    expect(res.data.nextSection).toBe("occupation");
    expect(res.data.steps).not.toContain("spouse");
    expectError(await client.put(sales, id, "spouse", spouseBody()), 404, "NOT_FOUND", "Data not found");
  });

  it("AC-43.04 removes spouse data and the Spouse step when Marital becomes Belum Kawin", async () => {
    const id = await draftWithApplicant(KAWIN);
    await client.save(sales, id, "spouse", spouseBody());

    const res = await client.save(sales, id, "personal", personalBody({ marital: "001" }));

    expect(res.data.steps).not.toContain("spouse");
    const saved = await form(id);
    expect(saved.sections.spouse).toBeNull();
    expect(saved.steps).not.toContain("spouse");
  });

  it("AC-45.01 saves self-employed business data and moves to the next step", async () => {
    const id = await draftWithApplicant("001");
    const occupation = await client.save(sales, id, "occupation", selfEmployed);
    expect(occupation.data.nextSection).toBe("business");

    const res = await client.save(sales, id, "business", businessBody());

    expect(res.data).toMatchObject({ savedSection: "business", nextSection: "documents" });
    expect((await form(id)).sections.business).toMatchObject({
      businessName: "Toko Sumber Rejeki",
      annualSales: "600000000.00",
      address: { zipCode: "40111" },
    });
  });

  it("AC-45.02 rejects a business launch date in the future (BUSINESS_LAUNCH_DATE_IN_FUTURE)", async () => {
    const id = await draftWithApplicant("001");
    await client.save(sales, id, "occupation", selfEmployed);

    expectError(
      await client.put(sales, id, "business", businessBody({ businessLaunchDate: dateFromToday(0, 1) })),
      422,
      "BUSINESS_LAUNCH_DATE_IN_FUTURE",
      "Business launch date must not be in the future",
    );
  });

  it("AC-45.03 skips Business for a Karyawan Swasta applicant (NOT_FOUND)", async () => {
    const id = await draftWithApplicant("001");

    const res = await client.save(sales, id, "occupation", occupationBody);

    expect(res.data.steps).not.toContain("business");
    expectError(await client.put(sales, id, "business", businessBody()), 404, "NOT_FOUND", "Data not found");
  });

  it("AC-45.04 rejects a KUR business running for less than 6 months (BUSINESS_TOO_NEW)", async () => {
    const kur = await availableProduct(db.owner, { prefix: "K" });
    await setSystemParameter(db.owner, "MIN_BUSINESS_MONTHS", "6", kur);
    const id = await draftWithApplicant("001", kur);
    await client.save(sales, id, "occupation", selfEmployed);

    expectError(
      await client.put(sales, id, "business", businessBody({ businessLaunchDate: dateFromToday(-6, 1) })),
      422,
      "BUSINESS_TOO_NEW",
      "Business must have been running for at least 6 months",
    );
    const exact = await client.save(sales, id, "business", businessBody({ businessLaunchDate: dateFromToday(-6) }));
    expect(exact.data.nextSection).toBe("documents");
  });

  it("AC-45.05 lists empty Business Name and Business Field and stays on Business", async () => {
    const id = await draftWithApplicant("001");
    await client.save(sales, id, "occupation", selfEmployed);

    const res = await client.put(
      sales,
      id,
      "business",
      businessBody({ businessName: undefined, businessField: undefined }),
    );

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details.map((detail) => [detail.field, detail.message])).toEqual([
      ["businessName", "This field is required"],
      ["businessField", "This field is required"],
    ]);
    expect((await form(id)).currentSection).toBe("business");
  });

  it("AC-50.06 TRM_STP_002 orders KTA, Kawin, Karyawan Swasta with Spouse after Personal", async () => {
    const id = await draftWithApplicant(KAWIN);

    expect((await form(id)).steps).toEqual([
      "application",
      "personal",
      "spouse",
      "occupation",
      "documents",
      "emergency-contact",
    ]);
  });

  it("marks an unsaved Spouse step at submit (INCOMPLETE_APPLICATION)", async () => {
    const product = await submittableProduct(db.owner);
    const id = await completeDraft(db.owner, client, sales, product, { personal: { marital: KAWIN } });

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${id}/submit`,
      headers: { ...sales.headers, "idempotency-key": uuidv7() },
    });

    expectError(res, 422, "INCOMPLETE_APPLICATION", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details).toContainEqual(
      expect.objectContaining({ field: "fullName", section: "spouse" }),
    );
  });
});
