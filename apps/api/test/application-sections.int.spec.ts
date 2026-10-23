import { applicationFormResponseSchema, errorEnvelopeSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedInsuranceIds } from "../src/modules/core/masterdata/seed/insurances.js";
import {
  availableProduct,
  birthDateForAge,
  KTP_ADDRESS,
  NIK,
  personalBody,
  sectionClient,
} from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { expectError } from "./support/route.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const POC_STEPS = ["application", "personal", "occupation", "documents", "emergency-contact"];
const REQUIRED = "This field is required";

/** Section Application dan Personal (api-specs 12 §12.3; AC-39.01 s.d. AC-39.03, AC-40.01 s.d. AC-40.10). */
describe("application and personal sections", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let otherSales: TestSession;
  let productId: string;
  let client: ReturnType<typeof sectionClient>;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const role = await createRole(db.owner, "Sales Section", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    otherSales = await createSession(db.owner, { roleId: role });
    productId = await availableProduct(db.owner);
    client = sectionClient(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const applicationBody = (overrides: object = {}) => ({
    applicationType: "NTB",
    productCategory: "NON_COLLATERAL",
    productId,
    segment: "MIKRO",
    tenorProposed: 36,
    requestedLimit: "20000000.00",
    insuranceId: seedInsuranceIds.asuransiContoh,
    ...overrides,
  });
  const form = async (id: string) => {
    const res = await app.inject({ method: "GET", url: `/api/v1/applications/${id}/form`, headers: sales.headers });
    expect(res.statusCode, res.body).toBe(200);
    return applicationFormResponseSchema.parse(res.json()).data;
  };

  it("AC-39.01 saves the Application section with Next and moves to Personal", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.save(sales, id, "application", applicationBody({ tenorProposed: 24 }));

    expect(res).toEqual({
      data: expect.objectContaining({ id, savedSection: "application", nextSection: "personal", steps: POC_STEPS }),
    });
    const saved = await form(id);
    expect(saved.currentSection).toBe("personal");
    expect(saved.sections.application).toMatchObject({
      tenorProposed: 24,
      insuranceId: seedInsuranceIds.asuransiContoh,
    });
  });

  it("AC-39.02 lists each empty required Application field and saves nothing", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.put(sales, id, "application", applicationBody({ requestedLimit: undefined }));

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      { field: "requestedLimit", code: "REQUIRED", message: REQUIRED },
    ]);
    expect((await form(id)).currentSection).toBe("application");
  });

  it("AC-39.02 rejects Next on the first Application step without Product", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: sales.headers,
      payload: { application: applicationBody({ productId: undefined }), personal: {}, strict: true },
    });

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      { field: "productId", code: "REQUIRED", message: REQUIRED },
    ]);
  });

  it("AC-39.03 TRM_APP_004 rejects a limit above the product maximum (LIMIT_OUT_OF_RANGE)", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.put(sales, id, "application", applicationBody({ requestedLimit: "300000001.00" }));

    expectError(res, 422, "LIMIT_OUT_OF_RANGE", "Requested limit must be between 5,000,000 and 300,000,000");
  });

  it("AC-39.03 TRM_APP_005 rejects a tenor below the product minimum on the first Next (TENOR_OUT_OF_RANGE)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: sales.headers,
      payload: {
        application: applicationBody({ tenorProposed: 5 }),
        personal: { idType: "KTP", idCardNumber: NIK, fullName: "Rudi Hartono", fullNameId: "RUDI HARTONO" },
        strict: true,
      },
    });

    expectError(res, 422, "TENOR_OUT_OF_RANGE", "Tenor must be between 6 and 60 months");
  });

  it("saves an incomplete section as draft with the draft message", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.save(sales, id, "application", applicationBody({ segment: undefined }), false);

    expect(res.data).toMatchObject({ savedSection: "application", nextSection: "personal" });
    expect(res.message).toMatch(/^Application saved as draft\. Loan ID: /);
    expect((await form(id)).currentSection).toBe("application");
  });

  it("keeps the draft minimum when saving the Application section as draft (DRAFT_MINIMUM_FIELDS)", async () => {
    const id = await client.createDraft(sales, productId);

    expectError(
      await client.put(sales, id, "application", applicationBody({ applicationType: "" }), false),
      422,
      "DRAFT_MINIMUM_FIELDS",
      "Fill in Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, and Full Name ID to save a draft",
    );
  });

  it("rejects an unavailable product (PRODUCT_NOT_AVAILABLE)", async () => {
    const id = await client.createDraft(sales, productId);

    expectError(
      await client.put(sales, id, "application", applicationBody({ productCategory: "PENSION" })),
      422,
      "PRODUCT_NOT_AVAILABLE",
      "Selected product is not available",
    );
  });

  it("AC-40.01 saves complete personal data and moves to Occupation", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.save(sales, id, "personal", personalBody({ npwpNumber: "123456789012345" }));

    expect(res.data).toMatchObject({ savedSection: "personal", nextSection: "occupation" });
    const saved = await form(id);
    expect(saved.currentSection).toBe("occupation");
    expect(saved.sections.personal).toMatchObject({
      idCardNumber: NIK,
      placeOfBirth: "Bandung",
      motherMaidenName: "Siti",
      npwpNumber: "123456789012345",
      mobileNumber: "081234567890",
    });
    const { rows } = await db.owner.query(
      "select mother_maiden_name_enc, npwp_number_enc from application.application_personals where application_id = $1",
      [id],
    );
    expect(rows[0].mother_maiden_name_enc.includes(Buffer.from("Siti"))).toBe(false);
  });

  it("AC-40.02 rejects an ID card number that is not 16 digits", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.put(sales, id, "personal", personalBody({ idCardNumber: "327301140290000" }));

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      expect.objectContaining({ field: "idCardNumber", message: "ID card number must be 16 digits" }),
    ]);
  });

  it("AC-40.03 rejects an applicant one day short of 21 (AGE_OUT_OF_RANGE)", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.put(sales, id, "personal", personalBody({ dateOfBirth: birthDateForAge(21, 1) }));

    expectError(res, 422, "AGE_OUT_OF_RANGE", "Applicant age must be between 21 and 55 years for this product");
  });

  it("AC-40.04 accepts an applicant who turns 21 today", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.save(sales, id, "personal", personalBody({}, 21));

    expect(res.data.nextSection).toBe("occupation");
  });

  it("AC-40.05 requires NPWP above 50,000,000 and AC-40.06 not at exactly 50,000,000 (NPWP_REQUIRED)", async () => {
    const above = await client.createDraft(sales, productId, { requestedLimit: "50000001.00" });
    const exact = await client.createDraft(sales, productId, { requestedLimit: "50000000.00" });

    expectError(
      await client.put(sales, above, "personal", personalBody()),
      422,
      "NPWP_REQUIRED",
      "NPWP is required for requested limit above 50,000,000",
    );
    expect((await client.save(sales, exact, "personal", personalBody())).data.nextSection).toBe("occupation");
  });

  it("AC-40.07 copies the ID address to the residence address", async () => {
    const id = await client.createDraft(sales, productId);

    await client.save(
      sales,
      id,
      "personal",
      personalBody({ addresses: { id: KTP_ADDRESS, residence: { sameAsId: true, address: "Diabaikan" } } }),
    );

    expect((await form(id)).sections.personal.addresses).toEqual({
      id: KTP_ADDRESS,
      residence: { ...KTP_ADDRESS, sameAsId: true },
    });
  });

  it("AC-40.08 records the consent time and WEB channel, and continues without consent", async () => {
    const consented = await client.createDraft(sales, productId);
    const without = await client.createDraft(sales, productId);

    await client.save(sales, consented, "personal", personalBody());
    await client.save(sales, without, "personal", personalBody({ consentGiven: false }));

    const { rows } = await db.owner.query(
      "select id, consent_at, consent_channel from application.applications where id = any($1) order by id",
      [[consented, without]],
    );
    expect(rows).toEqual([
      { id: consented, consent_at: expect.any(Date), consent_channel: "WEB" },
      { id: without, consent_at: null, consent_channel: null },
    ]);
  });

  it("AC-40.09 rejects an applicant older than 55 at maturity (AGE_AT_MATURITY_EXCEEDED)", async () => {
    const maturity = await availableProduct(db.owner, { maxAgeAtMaturityMonth: 660 });
    const id = await client.createDraft(sales, maturity, { tenorProposed: 60 });

    expectError(
      await client.put(sales, id, "personal", personalBody({}, 51)),
      422,
      "AGE_AT_MATURITY_EXCEEDED",
      "Applicant age at maturity must not exceed 55 years",
    );
  });

  it("AC-40.10 accepts only KTP as ID Type", async () => {
    const id = await client.createDraft(sales, productId);

    const res = await client.put(sales, id, "personal", personalBody({ idType: "SIM" }));

    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json()).details.map((detail) => detail.field)).toEqual(["idType"]);
  });

  it("AC-49.06 hides my draft from another Sales (NOT_FOUND)", async () => {
    const id = await client.createDraft(sales, productId);

    expectError(await client.put(otherSales, id, "personal", personalBody()), 404, "NOT_FOUND", "Data not found");
  });

  it("rejects a section save once the application left DRAFT (INVALID_STATE)", async () => {
    const id = await client.createDraft(sales, productId);
    await db.owner.query("update application.applications set status = 'ON_PROGRESS' where id = $1", [id]);

    expectError(
      await client.put(sales, id, "personal", personalBody()),
      409,
      "INVALID_STATE",
      "This action is not allowed in the current status",
    );
  });

  it("answers 404 for a Backlog section", async () => {
    const id = await client.createDraft(sales, productId);

    expectError(await client.put(sales, id, "spouse", {}), 404, "NOT_FOUND", "Data not found");
  });
});
