import { describe, expect, it } from "vitest";
import { dayMonthYear, maskAccountNumber, percentText, rupiah } from "./akad-format.js";

describe("akad format", () => {
  it("writes rupiah with dot thousands and cents only when present", () => {
    expect(rupiah("600000000.00")).toBe("Rp 600.000.000");
    expect(rupiah("4804000.50")).toBe("Rp 4.804.000,50");
    expect(rupiah("999.00")).toBe("Rp 999");
  });

  it("writes the interest rate without trailing zeros", () => {
    expect(percentText("9.5000")).toBe("9,5%");
    expect(percentText("14.0000")).toBe("14%");
  });

  it("writes the contract date as DD-MM-YYYY", () => {
    expect(dayMonthYear("2026-10-20")).toBe("20-10-2026");
  });

  it("masks all but the last four account digits", () => {
    expect(maskAccountNumber("0987654321")).toBe("******4321");
    expect(maskAccountNumber("123")).toBe("123");
  });
});
