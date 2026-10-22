import {
  changeRequestAcceptedSchema,
  changeRequestDetailResponseSchema,
  changeRequestListResponseSchema,
  errorEnvelopeSchema,
  productDetailResponseSchema,
  productListResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertProduct, ktaProduct, nextProductCode, productSessions, setCoreMaxTenor } from "./support/product.js";
import type { TestSession } from "./support/session.js";

const SEEDED_CORE_MAX_TENOR = 60;
const UNKNOWN_ID = "0192b6a5-ffff-7000-8000-000000000001";

/** Produk lewat checker-maker (api-specs 08 §8.1 s.d. §8.4). */
describe("/products", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    ({ maker, checker } = await productSessions(db.owner));
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const send = (session: TestSession, method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, ...(payload ? { payload } : {}) });
  const create = (overrides: object = {}) => send(maker, "POST", "/products", { ...ktaProduct, ...overrides });
  const update = (id: string, overrides: object) =>
    send(maker, "PUT", `/products/${id}`, { ...ktaProduct, isActive: true, ...overrides });
  const approve = (changeRequestId: string) => send(checker, "POST", `/change-requests/${changeRequestId}/approve`, {});
  const acceptedOf = (res: { statusCode: number; body: string; json(): unknown }) => {
    expect(res.statusCode, res.body).toBe(202);
    return changeRequestAcceptedSchema.parse(res.json());
  };
  const expectError = (res: { statusCode: number; json(): unknown }, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  const detailOf = async (id: string) =>
    productDetailResponseSchema.parse((await send(maker, "GET", `/products/${id}`)).json()).data;

  it("submits a new product for approval and lists it on Pending Product (AC-20.01)", async () => {
    const body = acceptedOf(await create());
    expect(body).toMatchObject({
      data: { entityType: "PRODUCT", entityId: null, status: "WAITING_APPROVAL" },
      message: "Data submitted for approval",
    });
    const res = await send(checker, "GET", "/change-requests?entityType=PRODUCT,PRODUCT_PRICING");
    const pending = changeRequestListResponseSchema.parse(res.json()).data;
    expect(pending.find((row) => row.id === body.data.changeRequestId)).toMatchObject({
      action: "CREATE",
      displayName: "Kredit Tanpa Agunan",
      status: "WAITING_APPROVAL",
    });
  });

  it("shows the product on the Product page once a checker approves it (AC-20.01)", async () => {
    const productCode = nextProductCode("N");
    const { data } = acceptedOf(await create({ productCode: productCode.toLowerCase() }));
    const approved = await approve(data.changeRequestId);
    expect(approved.statusCode, approved.body).toBe(200);
    const list = productListResponseSchema.parse((await send(maker, "GET", `/products?q=${productCode}`)).json());
    expect(list.data).toEqual([
      expect.objectContaining({ productCode, maxTenor: 60, isActive: true, hasPendingChange: false }),
    ]);
    const id = list.data[0]?.id ?? "";
    expect(await detailOf(id)).toMatchObject({
      productCode,
      limitAutoApproval: "10000000.00",
      adminFee: "0.00",
      dbrMax: "40.0000",
      validTo: null,
    });
  });

  it("rejects a maximal plafond below the minimal plafond (AC-20.02)", async () => {
    const res = await create({ productCode: nextProductCode(), minPlafond: "300000000.00", maxPlafond: "5000000.00" });
    expectError(res, 422, "INVALID_PLAFOND_RANGE", "Maximal plafond must be greater than minimal plafond");
  });

  it("rejects a product code already used by a product, ignoring case (AC-20.03)", async () => {
    const productCode = nextProductCode("E");
    await insertProduct(db.owner, { productCode });
    expectError(
      await create({ productCode: productCode.toLowerCase() }),
      409,
      "PRODUCT_CODE_EXISTS",
      "Product code already exists",
    );
  });

  it("rejects a product code still waiting for approval (AC-20.03)", async () => {
    const productCode = nextProductCode("W");
    acceptedOf(await create({ productCode }));
    expectError(await create({ productCode }), 409, "PRODUCT_CODE_EXISTS", "Product code already exists");
  });

  it("rejects a 6-character product code (AC-20.04)", async () => {
    const res = await create({ productCode: "KPRSUB" });
    expectError(res, 422, "INVALID_PRODUCT_CODE", "Product code must be 1 to 5 letters or digits");
  });

  it("rejects a limit auto approval above the maximal plafond (AC-20.05)", async () => {
    const res = await create({ productCode: nextProductCode(), limitAutoApproval: "300000001.00" });
    expectError(res, 422, "AUTO_APPROVAL_LIMIT_EXCEEDED", "Limit auto approval must not exceed maximal plafond");
  });

  it("marks an approved product without an approved route as having no active route (AC-20.06)", async () => {
    const productCode = nextProductCode("R");
    const id = await insertProduct(db.owner, { productCode });
    const list = productListResponseSchema.parse((await send(maker, "GET", `/products?q=${productCode}`)).json());
    expect(list.data[0]).toMatchObject({ id, hasActiveRoute: false });
    expect((await detailOf(id)).hasActiveRoute).toBe(false);
  });

  it("rejects a maximum tenor above the tenant's core banking limit (AC-20.07)", async () => {
    await setCoreMaxTenor(db.owner, 24);
    try {
      const res = await create({ productCode: nextProductCode(), maxTenor: 36 });
      expectError(res, 422, "TENOR_EXCEEDS_CORE_LIMIT", "Maximum tenor must not exceed core banking limit (24 months)");
    } finally {
      await setCoreMaxTenor(db.owner, SEEDED_CORE_MAX_TENOR);
    }
  });

  it("re-checks the core banking limit when a checker approves (AC-20.07)", async () => {
    const { data } = acceptedOf(await create({ productCode: nextProductCode() }));
    await setCoreMaxTenor(db.owner, 24);
    try {
      const res = await approve(data.changeRequestId);
      expectError(res, 422, "BUSINESS_RULE_VIOLATION", "Maximum tenor must not exceed core banking limit (24 months)");
    } finally {
      await setCoreMaxTenor(db.owner, SEEDED_CORE_MAX_TENOR);
    }
  });

  it("rejects a missing required field", async () => {
    const res = await send(maker, "POST", "/products", { ...ktaProduct, productName: undefined });
    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json()).details).toContainEqual(
      expect.objectContaining({ field: "productName" }),
    );
  });

  it("rejects a validity end before its start", async () => {
    const res = await create({ productCode: nextProductCode(), validTo: "2026-09-30" });
    expectError(res, 422, "INVALID_DATE_RANGE", "End date must be on or after start date");
  });

  it("submits a change with the current and proposed data and applies it on approval (AC-12.02)", async () => {
    const productCode = nextProductCode("U");
    const id = await insertProduct(db.owner, { productCode });
    const { data } = acceptedOf(await update(id, { productCode, dbrMax: "35.0000" }));
    expect(data).toMatchObject({ entityType: "PRODUCT", entityId: id });
    expect((await detailOf(id)).hasPendingChange).toBe(true);
    const detail = await send(checker, "GET", `/change-requests/${data.changeRequestId}`);
    expect(changeRequestDetailResponseSchema.parse(detail.json()).data).toMatchObject({
      action: "UPDATE",
      currentData: { dbrMax: "40.0000" },
      proposedData: { dbrMax: "35.0000" },
      changedFields: ["dbrMax"],
    });
    expect((await approve(data.changeRequestId)).statusCode).toBe(200);
    expect(await detailOf(id)).toMatchObject({ dbrMax: "35.0000", hasPendingChange: false });
  });

  it("refuses an edit while the product has a pending change (AC-12.06)", async () => {
    const productCode = nextProductCode("P");
    const id = await insertProduct(db.owner, { productCode });
    acceptedOf(await update(id, { productCode, productName: "KTA Baru" }));
    expectError(
      await update(id, { productCode, productName: "KTA Lagi" }),
      409,
      "PENDING_CHANGE_REQUEST",
      "This data has a pending submission and cannot be edited",
    );
  });

  it("rejects an edit identical to the active data", async () => {
    const productCode = nextProductCode("S");
    const id = await insertProduct(db.owner, { productCode });
    expectError(await update(id, { productCode }), 422, "NO_CHANGES", "No changes to submit");
  });

  it("rejects a changed product code on edit", async () => {
    const id = await insertProduct(db.owner, { productCode: nextProductCode("C") });
    const res = await update(id, { productCode: nextProductCode("C") });
    expectError(res, 422, "BUSINESS_RULE_VIOLATION", "Product code cannot be changed");
  });

  it("applies the product rules on edit (AC-20.02, AC-20.05, AC-20.07)", async () => {
    const productCode = nextProductCode("V");
    const id = await insertProduct(db.owner, { productCode });
    const res = await update(id, { productCode, minPlafond: "300000000.00", maxPlafond: "5000000.00" });
    expectError(res, 422, "INVALID_PLAFOND_RANGE", "Maximal plafond must be greater than minimal plafond");
  });

  it("answers 404 for an unknown product", async () => {
    expectError(await send(maker, "GET", `/products/${UNKNOWN_ID}`), 404, "NOT_FOUND", "Data not found");
    expectError(await update(UNKNOWN_ID, {}), 404, "NOT_FOUND", "Data not found");
  });

  it("filters, sorts, and pages the product list", async () => {
    const prefix = "Z";
    const codes = [nextProductCode(prefix), nextProductCode(prefix)];
    for (const productCode of codes) await insertProduct(db.owner, { productCode });
    const res = await send(
      maker,
      "GET",
      `/products?q=${prefix}0&productCategory=NON_COLLATERAL&isActive=true&pageSize=1&sort=productCode,desc`,
    );
    const page = productListResponseSchema.parse(res.json());
    expect(page.data.map((row) => row.productCode)).toEqual([codes[1]]);
    expect(page.meta).toMatchObject({ page: 1, pageSize: 1, totalItems: 2, totalPages: 2 });
  });
});
