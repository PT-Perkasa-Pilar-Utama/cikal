import { describe, expect, it } from "vitest";
import { changedFields } from "./changed-fields.js";

describe("changedFields", () => {
  it("marks the auto approval limit that changed from 10,000,000 to 15,000,000 (AC-12.02)", () => {
    const current = { productCode: "KTA", limitAutoApproval: "10000000.00" };
    const proposed = { productCode: "KTA", limitAutoApproval: "15000000.00" };
    expect(changedFields(current, proposed)).toEqual(["limitAutoApproval"]);
  });

  it("uses dotted paths for nested fields", () => {
    expect(changedFields({ pricing: { adminFee: "0.00" } }, { pricing: { adminFee: "50000.00" } })).toEqual([
      "pricing.adminFee",
    ]);
  });

  it("marks a field that the proposal removes", () => {
    expect(changedFields({ note: "x", code: "A" }, { code: "A" })).toEqual(["note"]);
  });

  it("compares arrays as one value", () => {
    expect(changedFields({ items: [1, 2] }, { items: [1, 3] })).toEqual(["items"]);
  });

  it("marks every proposed field of new data", () => {
    expect(changedFields(null, { productCode: "KPR", productName: "KPR Subsidi" })).toEqual([
      "productCode",
      "productName",
    ]);
  });
});
