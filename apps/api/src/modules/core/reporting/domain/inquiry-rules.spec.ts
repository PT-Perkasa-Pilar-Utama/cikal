import { describe, expect, it } from "vitest";
import { dateRangeError, inquirySort, maskIdCardNumber } from "./inquiry-rules.js";

describe("maskIdCardNumber", () => {
  it("keeps the first and last four digits", () => {
    expect(maskIdCardNumber("3273011402900001")).toBe("3273********0001");
  });
});

describe("dateRangeError", () => {
  it("AC-83.07 rejects an end date before the start date", () => {
    expect(dateRangeError({ submittedFrom: "2026-10-31", submittedTo: "2026-10-01" })).toMatchObject({
      code: "INVALID_DATE_RANGE",
      message: "End date must be on or after start date",
      status: 422,
    });
  });

  it("accepts a one-day range and an open range", () => {
    expect(dateRangeError({ submittedFrom: "2026-10-01", submittedTo: "2026-10-01" })).toBeNull();
    expect(dateRangeError({ submittedTo: "2026-10-01" })).toBeNull();
  });
});

describe("inquirySort", () => {
  it("AC-83.03 reads the column and direction", () => {
    expect(inquirySort("modifiedAt,desc")).toEqual({ field: "modifiedAt", direction: "desc" });
    expect(inquirySort("requestedLimit,asc")).toEqual({ field: "requestedLimit", direction: "asc" });
  });
});
