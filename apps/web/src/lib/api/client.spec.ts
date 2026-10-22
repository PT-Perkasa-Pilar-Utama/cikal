import { productListResponseMock, productListResponseSchema } from "@cikal/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./client";

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("apiRequest", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the parsed body on success", async () => {
    respond(200, productListResponseMock);
    await expect(apiRequest(productListResponseSchema, "/v1/products")).resolves.toEqual(productListResponseMock);
  });

  it("throws ApiError carrying the AC message from the error envelope", async () => {
    respond(409, {
      code: "PENDING_CHANGE_REQUEST",
      message: "This data has a pending submission and cannot be edited",
      details: [],
      correlationId: "c-1",
    });
    const error = await apiRequest(productListResponseSchema, "/v1/products").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("This data has a pending submission and cannot be edited");
    expect((error as ApiError).status).toBe(409);
  });

  it("echoes the cikal_csrf cookie in X-CSRF-Token on a POST", async () => {
    document.cookie = "cikal_csrf=csrf-123";
    const fetchSpy = respond(200, productListResponseMock);
    await apiRequest(productListResponseSchema, "/v1/products", { method: "POST", body: "{}" });
    expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).get("X-CSRF-Token")).toBe("csrf-123");
  });

  it("does not send X-CSRF-Token on a GET", async () => {
    document.cookie = "cikal_csrf=csrf-123";
    const fetchSpy = respond(200, productListResponseMock);
    await apiRequest(productListResponseSchema, "/v1/products");
    expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).has("X-CSRF-Token")).toBe(false);
  });
});
