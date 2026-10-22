import {
  changeRequestAcceptedSchema,
  changeRequestListResponseSchema,
  errorEnvelopeSchema,
  productPricingResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertProduct, ktaProduct, nextProductCode, productSessions } from "./support/product.js";
import type { TestSession } from "./support/session.js";

const UNKNOWN_ID = "0192b6a5-ffff-7000-8000-000000000001";
const approverRange = { approverRateMin: "11.0000", approverRateMax: "15.0000" };
/** Contoh AC-97.01: 12% p.a. 01-10-2026 s.d. 31-12-2026, 14% p.a. mulai 01-01-2027 tanpa tanggal akhir. */
const ac9701 = {
  adminFee: "250000.00",
  provisionFee: "1.0000",
  subProducts: [
    { interestRate: "12.0000", validFrom: "2026-10-01", validTo: "2026-12-31", ...approverRange },
    { interestRate: "14.0000", validFrom: "2027-01-01", ...approverRange },
  ],
};

/** Pricing produk lewat checker-maker (api-specs 08 §8.5, §8.6). */
describe("/products/{id}/pricing", () => {
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
  const putPricing = (id: string, payload: object = ac9701) => send(maker, "PUT", `/products/${id}/pricing`, payload);
  const pricingOf = async (id: string) =>
    productPricingResponseSchema.parse((await send(maker, "GET", `/products/${id}/pricing`)).json()).data;
  const acceptedOf = (res: { statusCode: number; body: string; json(): unknown }) => {
    expect(res.statusCode, res.body).toBe(202);
    return changeRequestAcceptedSchema.parse(res.json());
  };
  const expectError = (res: { statusCode: number; json(): unknown }, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };

  it("submits per-period pricing and lists it on Pending Product (AC-97.01)", async () => {
    const id = await insertProduct(db.owner);
    const body = acceptedOf(await putPricing(id));
    expect(body).toMatchObject({
      data: { entityType: "PRODUCT_PRICING", entityId: id, status: "WAITING_APPROVAL" },
      message: "Data submitted for approval",
    });
    const res = await send(checker, "GET", "/change-requests?entityType=PRODUCT,PRODUCT_PRICING");
    const pending = changeRequestListResponseSchema.parse(res.json()).data;
    expect(pending.find((row) => row.id === body.data.changeRequestId)).toMatchObject({
      entityType: "PRODUCT_PRICING",
      action: "UPDATE",
      displayName: "Kredit Tanpa Agunan",
    });
    expect((await pricingOf(id)).hasPendingChange).toBe(true);
  });

  it("applies the approved pricing to the Pricing tab (AC-97.01)", async () => {
    const id = await insertProduct(db.owner);
    const { data } = acceptedOf(await putPricing(id));
    const approved = await send(checker, "POST", `/change-requests/${data.changeRequestId}/approve`, {});
    expect(approved.statusCode, approved.body).toBe(200);
    expect(await pricingOf(id)).toMatchObject({
      productId: id,
      interestType: "EFFECTIVE",
      adminFee: "250000.00",
      provisionFee: "1.0000",
      salesFee: null,
      hasPendingChange: false,
      subProducts: [
        { interestRate: "12.0000", validFrom: "2026-10-01", validTo: "2026-12-31", ...approverRange },
        { interestRate: "14.0000", validFrom: "2027-01-01", validTo: null, ...approverRange },
      ],
    });
  });

  it("rejects overlapping pricing periods (AC-97.02)", async () => {
    const id = await insertProduct(db.owner);
    const res = await putPricing(id, {
      ...ac9701,
      subProducts: [
        { interestRate: "12.0000", validFrom: "2026-10-01", validTo: "2026-12-31" },
        { interestRate: "14.0000", validFrom: "2026-12-15" },
      ],
    });
    expectError(res, 422, "PRICING_PERIOD_OVERLAP", "Pricing periods must not overlap");
  });

  it("rejects an approver rate range that does not include the interest rate (AC-97.03)", async () => {
    const id = await insertProduct(db.owner);
    const res = await putPricing(id, {
      ...ac9701,
      subProducts: [
        { interestRate: "14.0000", approverRateMin: "10.0000", approverRateMax: "13.0000", validFrom: "2026-10-01" },
      ],
    });
    expectError(res, 422, "INVALID_APPROVER_RATE_RANGE", "Approver rate range must include the interest rate");
  });

  it("refuses pricing while the product has a pending change (AC-12.06)", async () => {
    const productCode = nextProductCode();
    const id = await insertProduct(db.owner, { productCode });
    const edit = { ...ktaProduct, productCode, productName: "KTA Diubah", isActive: true };
    acceptedOf(await send(maker, "PUT", `/products/${id}`, edit));
    expectError(
      await putPricing(id),
      409,
      "PENDING_CHANGE_REQUEST",
      "This data has a pending submission and cannot be edited",
    );
  });

  it("refuses a product edit while its pricing is pending (AC-12.06)", async () => {
    const productCode = nextProductCode();
    const id = await insertProduct(db.owner, { productCode });
    acceptedOf(await putPricing(id));
    const res = await send(maker, "PUT", `/products/${id}`, {
      ...ktaProduct,
      productCode,
      dbrMax: "30.0000",
      isActive: true,
    });
    expectError(res, 409, "PENDING_CHANGE_REQUEST", "This data has a pending submission and cannot be edited");
  });

  it("rejects pricing without any period", async () => {
    const res = await putPricing(await insertProduct(db.owner), { ...ac9701, subProducts: [] });
    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json()).code).toBe("VALIDATION_FAILED");
  });

  it("rejects a zero interest rate with the row path", async () => {
    const res = await putPricing(await insertProduct(db.owner), {
      ...ac9701,
      subProducts: [{ interestRate: "0.0000", validFrom: "2026-10-01" }],
    });
    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      { field: "subProducts.0.interestRate", code: "OUT_OF_RANGE", message: "Interest rate must be greater than 0" },
    ]);
  });

  it("rejects a period that ends before it starts", async () => {
    const res = await putPricing(await insertProduct(db.owner), {
      ...ac9701,
      subProducts: [{ interestRate: "12.0000", validFrom: "2026-10-01", validTo: "2026-09-30" }],
    });
    expectError(res, 422, "INVALID_DATE_RANGE", "End date must be on or after start date");
  });

  it("answers 404 for the pricing of an unknown product", async () => {
    expectError(await send(maker, "GET", `/products/${UNKNOWN_ID}/pricing`), 404, "NOT_FOUND", "Data not found");
    expectError(await putPricing(UNKNOWN_ID), 404, "NOT_FOUND", "Data not found");
  });
});
