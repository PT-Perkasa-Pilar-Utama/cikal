import { describe, expect, it } from "vitest";
import { maskPii } from "./masking.js";

describe("maskPii", () => {
  it("masks NIK, KK number, mother maiden name, and account number at any depth (IN-06)", () => {
    expect(
      maskPii({
        nik: "3171010101900001",
        fullName: "Rudi Hartono",
        family: { kkNumber: "3171010101900099", motherMaidenName: "Siti Aminah" },
        accounts: [{ accountNumber: "1234567890" }],
      }),
    ).toEqual({
      nik: "************0001",
      fullName: "Rudi Hartono",
      family: { kkNumber: "************0099", motherMaidenName: "*******inah" },
      accounts: [{ accountNumber: "******7890" }],
    });
  });

  it("hides short and non-text PII values completely", () => {
    expect(maskPii({ nik: "1234", accountNumber: 12345 })).toEqual({ nik: "****", accountNumber: "***" });
  });

  it("returns values without PII unchanged", () => {
    expect(maskPii(["a", 1, null])).toEqual(["a", 1, null]);
  });
});
