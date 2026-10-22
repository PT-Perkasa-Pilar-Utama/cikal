import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as c from "./index.js";

/** Setiap mock yang dipakai stub API dan test frontend harus lolos skema kontraknya. */
const pairs: Array<[string, z.ZodType, unknown]> = [
  ["loginResponse", c.loginResponseSchema, c.loginResponseMock],
  ["sessionResponse", c.sessionResponseSchema, c.sessionResponseMock],
  ["roleList", c.roleListResponseSchema, c.roleListResponseMock],
  ["menuTree", c.menuTreeResponseSchema, c.menuTreeResponseMock],
  ["roleAccessList", c.roleAccessListResponseSchema, c.roleAccessListResponseMock],
  ["changeRequestList", c.changeRequestListResponseSchema, c.changeRequestListResponseMock],
  ["changeRequestDetail", c.changeRequestDetailResponseSchema, c.changeRequestDetailResponseMock],
  ["changeRequestApprove", c.changeRequestReviewResponseSchema, c.changeRequestApproveResponseMock],
  ["changeRequestReject", c.changeRequestReviewResponseSchema, c.changeRequestRejectResponseMock],
  ["changeRequestAccepted", c.changeRequestAcceptedSchema, c.changeRequestAcceptedMock("PRODUCT", null)],
  ["productList", c.productListResponseSchema, c.productListResponseMock],
  ["productDetail", c.productDetailResponseSchema, c.productDetailResponseMock],
  ["productPricing", c.productPricingResponseSchema, c.productPricingResponseMock],
];

describe("contract mocks", () => {
  it.each(pairs)("%s satisfies its schema", (_name, schema, mock) => {
    const result = schema.safeParse(mock);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("rejects a product code longer than 5 characters (AC-20.04)", () => {
    const result = c.productCreateRequestSchema.shape.productCode.safeParse("KPRSUB");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Product code must be 1 to 5 letters or digits");
  });

  it("reports the AC message for empty login fields (AC-01.04)", () => {
    const result = c.loginRequestSchema.safeParse({ username: "", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(["Username is required", "Password is required"]);
  });
});
