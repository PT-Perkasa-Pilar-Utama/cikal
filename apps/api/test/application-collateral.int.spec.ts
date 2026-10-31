import { applicationFormResponseSchema, errorEnvelopeSchema, type ProductCategory } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { businessDate } from "../src/platform/clock/business-date.js";
import {
  availableProduct,
  occupationBody,
  personalBody,
  sectionClient,
  setSystemParameter,
} from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { expectError } from "./support/route.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const ADDRESS = {
  address: "Jl. Soekarno Hatta 20",
  provinceCode: "32",
  cityCode: "32.73",
  districtCode: "32.73.01",
  subDistrictCode: "32.73.01.1001",
  zipCode: "40111",
};
/** Kendaraan tahun 2021 seharga 180 juta (AC-46.01). */
const vehicleBody = (overrides: object = {}) => ({
  collateralType: "VEHICLE",
  vehicleType: "MOBIL",
  vehicleBrand: "Toyota",
  vehicleModel: "Avanza",
  vehicleYear: 2021,
  vehiclePrice: "180000000.00",
  vehicleColor: "Hitam",
  machineNumber: "1NRX123456",
  frameNumber: "MHKA1BA1JKK123456",
  bpkbNumber: "P01234567",
  policeNumber: "D 1234 ABC",
  address: ADDRESS,
  ...overrides,
});
const selfEmployed = { ...occupationBody, sourceOfIncome: "002", occupation: "005", company: {} };

/**
 * Section Collateral dan urutan step lengkap (api-specs 12 §12.1, §12.3; AC-46.01 s.d. AC-46.06, AC-50.06
 * TRM_STP_003 s.d. TRM_STP_006).
 */
describe("collateral section", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let client: ReturnType<typeof sectionClient>;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const role = await createRole(db.owner, "Sales Agunan", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
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
  const draftFor = async (productCategory: ProductCategory, marital = "001", prefix = "C") => {
    const product = await availableProduct(db.owner, { productCategory, prefix });
    const id = await client.createDraft(sales, product, { productCategory });
    await client.save(sales, id, "personal", personalBody({ marital }));
    return { id, product };
  };

  it("AC-46.01 saves vehicle collateral and moves to Document", async () => {
    const { id } = await draftFor("COLLATERAL");

    const res = await client.save(sales, id, "collateral", vehicleBody());

    expect(res.data).toMatchObject({ savedSection: "collateral", nextSection: "documents" });
    expect((await form(id)).sections.collateral).toMatchObject({
      collateralType: "VEHICLE",
      vehicleYear: 2021,
      vehiclePrice: "180000000.00",
      frameNumber: "MHKA1BA1JKK123456",
    });
  });

  it("AC-46.02 offers only Sertifikat for a KPR product and stores the certificate number encrypted", async () => {
    const { id, product } = await draftFor("COLLATERAL", "001", "R");
    await setSystemParameter(db.owner, "COLLATERAL_TYPES", '["CERTIFICATE"]', product);

    expect((await form(id)).collateralTypes).toEqual(["CERTIFICATE"]);
    expectError(
      await client.put(sales, id, "collateral", vehicleBody()),
      422,
      "COLLATERAL_TYPE_NOT_ALLOWED",
      "Selected collateral type is not available for this product",
    );
    const certificate = {
      collateralType: "CERTIFICATE",
      certificateType: "SHM",
      certificateNumber: "10.01.02.03.1.00123",
      surfaceArea: "120.50",
      address: ADDRESS,
    };
    await client.save(sales, id, "collateral", certificate);
    expect((await form(id)).sections.collateral).toMatchObject({
      certificateNumber: "10.01.02.03.1.00123",
      surfaceArea: "120.50",
    });
    const { rows } = await db.owner.query(
      "select certificate_number_enc is not null as encrypted from application.application_collaterals where application_id = $1",
      [id],
    );
    expect(rows[0]).toEqual({ encrypted: true });
  });

  it("AC-46.03 saves a pension decree for a Pension product and moves to Document", async () => {
    const { id } = await draftFor("PENSION", "001", "P");
    expect((await form(id)).collateralTypes).toEqual(["PENSION_DECREE"]);

    const res = await client.save(sales, id, "collateral", {
      collateralType: "PENSION_DECREE",
      decreeNumber: "SK-123/2020",
      decreeDate: "2020-05-01",
    });

    expect(res.data.nextSection).toBe("documents");
  });

  it("AC-46.04 rejects a vehicle year later than the current year (VEHICLE_YEAR_IN_FUTURE)", async () => {
    const { id } = await draftFor("COLLATERAL");
    const year = Number(businessDate(new Date()).slice(0, 4));

    expectError(
      await client.put(sales, id, "collateral", vehicleBody({ vehicleYear: year + 1 })),
      422,
      "VEHICLE_YEAR_IN_FUTURE",
      `Vehicle year must not be later than ${year}`,
    );
  });

  it("AC-46.05 skips Collateral for a Non Collateral KTA (NOT_FOUND)", async () => {
    const { id } = await draftFor("NON_COLLATERAL", "001", "S");

    const saved = await form(id);

    expect(saved.steps).not.toContain("collateral");
    expect(saved.collateralTypes).toEqual([]);
    expect((await client.save(sales, id, "occupation", occupationBody)).data.nextSection).toBe("documents");
    expectError(await client.put(sales, id, "collateral", vehicleBody()), 404, "NOT_FOUND", "Data not found");
  });

  it("AC-46.06 lists empty Frame Number and BPKB Number", async () => {
    const { id } = await draftFor("COLLATERAL");

    const res = await client.put(sales, id, "collateral", vehicleBody({ frameNumber: "", bpkbNumber: undefined }));

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details.map((detail) => [detail.field, detail.message])).toEqual([
      ["frameNumber", "This field is required"],
      ["bpkbNumber", "This field is required"],
    ]);
  });

  it("AC-50.06 TRM_STP_003 orders Kredit Agunan, Kawin, Wiraswasta with Spouse, Business, and Collateral", async () => {
    const { id } = await draftFor("COLLATERAL", "002");
    await client.save(sales, id, "occupation", selfEmployed);

    expect((await form(id)).steps).toEqual([
      "application",
      "personal",
      "spouse",
      "occupation",
      "business",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });

  it("AC-50.06 TRM_STP_004 orders KUR Kecil, Belum Kawin, Wiraswasta with Business and Collateral", async () => {
    const { id } = await draftFor("COLLATERAL", "001", "K");
    await client.save(sales, id, "occupation", selfEmployed);

    expect((await form(id)).steps).toEqual([
      "application",
      "personal",
      "occupation",
      "business",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });

  it("AC-50.06 TRM_STP_005 orders KPR, Cerai Hidup, ASN with Collateral only", async () => {
    const { id } = await draftFor("COLLATERAL", "003", "R");
    await client.save(sales, id, "occupation", { ...occupationBody, occupation: "002" });

    expect((await form(id)).steps).toEqual([
      "application",
      "personal",
      "occupation",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });

  it("AC-50.06 TRM_STP_006 orders Pension, Kawin, Pensiunan with Spouse and Collateral", async () => {
    const { id } = await draftFor("PENSION", "002", "P");
    await client.save(sales, id, "occupation", {
      ...occupationBody,
      occupation: "004",
      monthlyIncomeAllowance: undefined,
      tenureAtCurrentJob: undefined,
    });

    expect((await form(id)).steps).toEqual([
      "application",
      "personal",
      "spouse",
      "occupation",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });
});
