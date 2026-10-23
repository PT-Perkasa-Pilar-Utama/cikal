import {
  availableProductsResponseSchema,
  productDetailResponseSchema,
  productListResponseSchema,
  type StepCode,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { businessDate } from "../src/platform/clock/business-date.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { businessDateIn } from "./support/license.js";
import { insertRoute } from "./support/process.js";
import { insertProduct, insertSubProduct, nextProductCode } from "./support/product.js";
import { expectError } from "./support/route.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const STEPS: Partial<Record<StepCode, boolean>> = { DATA_ENTRY: true, APPROVAL: true };

/** Dropdown "Product" step Application dan tanda rute ACTIVE di halaman "Product" (api-specs 08 §8.1, §8.2, §8.7). */
describe("/products/available", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let maker: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const salesRole = await createRole(db.owner, "Sales Entry", [{ menuCode: "APP-ENTRY", view: true }]);
    const makerRole = await createRole(db.owner, "Maker Produk", [{ menuCode: "MST-PRODUCT", view: true }]);
    sales = await createSession(db.owner, { roleId: salesRole });
    maker = await createSession(db.owner, { roleId: makerRole });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const get = (session: TestSession, url: string) =>
    app.inject({ method: "GET", url: `/api/v1${url}`, headers: session.headers });
  const availableCodes = async (productCategory: string) => {
    const res = await get(sales, `/products/available?productCategory=${productCategory}`);
    expect(res.statusCode, res.body).toBe(200);
    return availableProductsResponseSchema.parse(res.json()).data.map((product) => product.productCode);
  };
  const withRoute = async (overrides: Parameters<typeof insertProduct>[1], status: "ACTIVE" | "WAITING_APPROVAL") => {
    const productId = await insertProduct(db.owner, overrides);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status, steps: STEPS }]);
    return productId;
  };

  it("AC-20.06 leaves an approved product without an approved route out of the Product dropdown", async () => {
    const productCode = nextProductCode("R");
    const productId = await insertProduct(db.owner, { productCode, productCategory: "PENSION" });

    expect(await availableCodes("PENSION")).not.toContain(productCode);
    const list = productListResponseSchema.parse((await get(maker, `/products?q=${productCode}`)).json()).data;
    expect(list).toEqual([expect.objectContaining({ productCode, hasActiveRoute: false })]);
    const detail = productDetailResponseSchema.parse((await get(maker, `/products/${productId}`)).json()).data;
    expect(detail.hasActiveRoute).toBe(false);
  });

  it("marks a product with an ACTIVE route on the Product page", async () => {
    const productCode = nextProductCode("A");
    const productId = await withRoute({ productCode }, "ACTIVE");

    const list = productListResponseSchema.parse((await get(maker, `/products?q=${productCode}`)).json()).data;
    expect(list).toEqual([expect.objectContaining({ productCode, hasActiveRoute: true })]);
    const detail = productDetailResponseSchema.parse((await get(maker, `/products/${productId}`)).json()).data;
    expect(detail.hasActiveRoute).toBe(true);
  });

  it("AC-39.05 lists only active products of the category with an approved route", async () => {
    const kpr = nextProductCode("K");
    const subsidi = nextProductCode("S");
    const inactive = nextProductCode("I");
    const expired = nextProductCode("X");
    const otherCategory = nextProductCode("O");
    await withRoute({ productCode: kpr, productCategory: "COLLATERAL" }, "ACTIVE");
    await withRoute(
      { productCode: subsidi, productName: "KPR Subsidi", productCategory: "COLLATERAL" },
      "WAITING_APPROVAL",
    );
    await withRoute({ productCode: inactive, productCategory: "COLLATERAL", isActive: false }, "ACTIVE");
    await withRoute({ productCode: expired, productCategory: "COLLATERAL", validTo: businessDateIn(-1) }, "ACTIVE");
    await withRoute({ productCode: otherCategory, productCategory: "SYARIAH" }, "ACTIVE");

    const codes = await availableCodes("COLLATERAL");

    expect(codes).toContain(kpr);
    expect(codes).not.toContain(subsidi);
    expect(codes).not.toContain(inactive);
    expect(codes).not.toContain(expired);
    expect(codes).not.toContain(otherCategory);
  });

  it("returns the product terms and today's interest rate for the Application form (AC-97.04)", async () => {
    const productCode = nextProductCode("P");
    const productId = await withRoute({ productCode, productCategory: "SYARIAH" }, "ACTIVE");
    const today = businessDate(new Date());
    await insertSubProduct(db.owner, productId, {
      interestRate: "12.0000",
      validFrom: "2026-01-01",
      validTo: businessDateIn(-1),
    });
    await insertSubProduct(db.owner, productId, { interestRate: "14.0000", validFrom: today });

    const res = await get(sales, "/products/available?productCategory=SYARIAH");

    expect(availableProductsResponseSchema.parse(res.json()).data.find((p) => p.productCode === productCode)).toEqual({
      id: productId,
      productCode,
      productName: "Kredit Tanpa Agunan",
      interestType: "EFFECTIVE",
      minPlafond: "5000000.00",
      maxPlafond: "300000000.00",
      minTenor: 6,
      maxTenor: 60,
      minAge: 21,
      maxAge: 55,
      currentInterestRate: "14.0000",
    });
  });

  it("requires a product category", async () => {
    expectError(
      await get(sales, "/products/available"),
      400,
      "VALIDATION_FAILED",
      "Please complete all required fields",
    );
  });

  it("refuses a user without Application Entry access", async () => {
    expectError(
      await get(maker, "/products/available?productCategory=PENSION"),
      403,
      "ACCESS_DENIED",
      "You do not have access to this page",
    );
  });
});
