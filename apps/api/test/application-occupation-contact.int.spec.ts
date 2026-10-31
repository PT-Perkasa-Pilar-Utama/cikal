import { applicationFormResponseSchema, errorEnvelopeSchema, insuranceListResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import {
  APPLICANT_MOBILE,
  availableProduct,
  personalBody,
  sectionClient,
  setSystemParameter,
} from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { expectError } from "./support/route.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const INACTIVE_INSURANCE = "0192b6f4-0001-7000-8000-000000000001";
const MOBILE_MESSAGE = "Mobile number must start with 08 and contain 10 to 13 digits";
const COMPANY = {
  name: "PT Maju Jaya",
  address: "Jl. Asia Afrika 1",
  provinceCode: "32",
  cityCode: "32.73",
  districtCode: "32.73.01",
  subDistrictCode: "32.73.01.1001",
  zipCode: "40111",
  phoneNumber: "0221234567",
};

/**
 * Section Occupation dan Emergency Contact (api-specs 12 §12.3; AC-44.01 s.d. AC-44.05, AC-48.01 s.d. AC-48.04),
 * serta dropdown asuransi (api-specs 06 §6.2). Seed `dev`: Source of Income "001" Bekerja, Occupation "001"
 * Karyawan Swasta dan "005" Wiraswasta.
 */
describe("occupation and emergency contact sections", () => {
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
    const role = await createRole(db.owner, "Sales Pekerjaan", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    await db.owner.query(
      `insert into masterdata.insurances (id, tenant_id, insurance_code, insurance_name, is_active)
       values ($1, $2, 'ASR99', 'Asuransi Lama', false)`,
      [INACTIVE_INSURANCE, seedCompanyIds.company001],
    );
    productId = await availableProduct(db.owner);
    client = sectionClient(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  /** Karyawan swasta di perdagangan (AC-44.01). */
  const occupationBody = (overrides: object = {}) => ({
    sourceOfIncome: "001",
    occupation: "001",
    industryOfProfession: "001",
    tenureAtCurrentJob: "4",
    monthlyIncomeAllowance: "8000000.00",
    company: COMPANY,
    ...overrides,
  });
  /** Kontak darurat AC-48.01. */
  const contactBody = (mobileNumber: string) => ({
    contactName: "Dewi",
    mobileNumber,
    relationToApplicant: "002",
    address: { address: "Jl. Braga 5", provinceCode: "32" },
  });
  const form = async (id: string) => {
    const res = await app.inject({ method: "GET", url: `/api/v1/applications/${id}/form`, headers: sales.headers });
    expect(res.statusCode, res.body).toBe(200);
    return applicationFormResponseSchema.parse(res.json()).data;
  };
  const draftWithApplicant = async (product = productId, category = "NON_COLLATERAL") => {
    const id = await client.createDraft(sales, product, { productCategory: category });
    await client.save(sales, id, "personal", personalBody());
    return id;
  };

  it("AC-44.01 saves employee occupation data and moves to the next step", async () => {
    const id = await draftWithApplicant();

    const res = await client.save(sales, id, "occupation", occupationBody());

    expect(res.data).toMatchObject({ savedSection: "occupation", nextSection: "documents" });
    expect((await form(id)).sections.occupation).toMatchObject({
      occupation: "001",
      tenureAtCurrentJob: "4.0",
      monthlyIncomeAllowance: "8000000.00",
      company: { name: "PT Maju Jaya", phoneNumber: "0221234567" },
    });
  });

  it("AC-44.02 rejects a monthly income of 0 (INVALID_INCOME)", async () => {
    const id = await draftWithApplicant();

    expectError(
      await client.put(sales, id, "occupation", occupationBody({ monthlyIncomeAllowance: "0.00" })),
      422,
      "INVALID_INCOME",
      "Monthly income must be greater than 0",
    );
  });

  it("AC-44.03 does not require income and tenure for a Pension product", async () => {
    const pension = await availableProduct(db.owner, { productCategory: "PENSION", prefix: "P" });
    const id = await draftWithApplicant(pension, "PENSION");

    const res = await client.save(
      sales,
      id,
      "occupation",
      occupationBody({ monthlyIncomeAllowance: undefined, tenureAtCurrentJob: undefined }),
    );

    expect(res.data.nextSection).toBe("collateral");
  });

  it("AC-44.04 accepts only self-employed applicants for a KUR product (OCCUPATION_NOT_ELIGIBLE)", async () => {
    const kur = await availableProduct(db.owner, { prefix: "K" });
    await setSystemParameter(db.owner, "SELF_EMPLOYED_ONLY", "true", kur);
    const id = await draftWithApplicant(kur);

    expectError(
      await client.put(sales, id, "occupation", occupationBody()),
      422,
      "OCCUPATION_NOT_ELIGIBLE",
      "This product is only available for self-employed applicants",
    );
    const selfEmployed = await client.save(
      sales,
      id,
      "occupation",
      occupationBody({ sourceOfIncome: "002", occupation: "005", company: {} }),
    );
    expect(selfEmployed.data.nextSection).toBe("business");
  });

  it("AC-44.05 lists empty Occupation and Company Name and stays on Occupation", async () => {
    const id = await draftWithApplicant();

    const res = await client.put(
      sales,
      id,
      "occupation",
      occupationBody({ occupation: undefined, company: { ...COMPANY, name: "" } }),
    );

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details.map((detail) => detail.field)).toEqual([
      "occupation",
      "company.name",
    ]);
    expect((await form(id)).currentSection).toBe("occupation");
  });

  it("AC-48.01 saves the emergency contact on the last step", async () => {
    const id = await draftWithApplicant();

    const res = await client.save(sales, id, "emergency-contact", contactBody("081298765432"));

    expect(res.data).toMatchObject({ savedSection: "emergency-contact", nextSection: null });
    const saved = await form(id);
    expect(saved.currentSection).toBe("emergency-contact");
    expect(saved.sections["emergency-contact"]).toMatchObject({
      contactName: "Dewi",
      relationToApplicant: "002",
      address: { address: "Jl. Braga 5", provinceCode: "32", rt: null },
    });
  });

  it.each([
    ["AC-48.02", "12345"],
    ["AC-48.04", "08123456789012"],
  ])("%s rejects mobile number %s", async (_ac, mobileNumber) => {
    const id = await draftWithApplicant();

    const res = await client.put(sales, id, "emergency-contact", contactBody(mobileNumber));

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      expect.objectContaining({ field: "mobileNumber", message: MOBILE_MESSAGE }),
    ]);
  });

  it("AC-48.03 rejects the applicant's own mobile number (EMERGENCY_CONTACT_SAME_NUMBER)", async () => {
    const id = await draftWithApplicant();

    expectError(
      await client.put(sales, id, "emergency-contact", contactBody(APPLICANT_MOBILE)),
      422,
      "EMERGENCY_CONTACT_SAME_NUMBER",
      "Emergency contact number must be different from applicant number",
    );
  });

  it("AC-39.01 lists active insurances for the Application step", async () => {
    const list = async (session: TestSession, query = "") => {
      const res = await app.inject({ method: "GET", url: `/api/v1/insurances${query}`, headers: session.headers });
      expect(res.statusCode, res.body).toBe(200);
      return insuranceListResponseSchema.parse(res.json()).data.map((row) => row.insuranceCode);
    };

    expect(await list(sales)).toEqual(["ASR01"]);
    expect(await list(sales, "?includeInactive=true")).toEqual(["ASR01", "ASR99"]);
    const maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    expect(await list(maker)).toEqual(["ASR01"]);
    const noAccess = await createSession(db.owner, { roleId: null });
    expectError(
      await app.inject({ method: "GET", url: "/api/v1/insurances", headers: noAccess.headers }),
      403,
      "ACCESS_DENIED",
      "You do not have access to this page",
    );
  });

  it("rejects an inactive insurance on the Application section", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.put(
      sales,
      id,
      "application",
      { applicationType: "NTB", productCategory: "NON_COLLATERAL", productId, insuranceId: INACTIVE_INSURANCE },
      false,
    );

    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      { field: "insuranceId", code: "INVALID", message: "Selected insurance is not available" },
    ]);
  });
});
