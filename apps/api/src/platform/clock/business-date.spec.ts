import { describe, expect, it } from "vitest";
import { businessDate } from "./business-date.js";

describe("businessDate", () => {
  it("rolls over to the next day at midnight Asia/Jakarta, not UTC", () => {
    expect(businessDate(new Date("2026-10-26T16:59:59Z"))).toBe("2026-10-26");
    expect(businessDate(new Date("2026-10-26T17:00:00Z"))).toBe("2026-10-27");
  });
});
