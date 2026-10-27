import { describe, expect, it } from "vitest";
import { businessDate, businessDayRange } from "./business-date.js";

describe("businessDate", () => {
  it("rolls over to the next day at midnight Asia/Jakarta, not UTC", () => {
    expect(businessDate(new Date("2026-10-26T16:59:59Z"))).toBe("2026-10-26");
    expect(businessDate(new Date("2026-10-26T17:00:00Z"))).toBe("2026-10-27");
  });
});

describe("businessDayRange", () => {
  it("spans one Asia/Jakarta day in UTC", () => {
    expect(businessDayRange("2026-10-27")).toEqual({
      start: new Date("2026-10-26T17:00:00Z"),
      end: new Date("2026-10-27T17:00:00Z"),
    });
  });
});
