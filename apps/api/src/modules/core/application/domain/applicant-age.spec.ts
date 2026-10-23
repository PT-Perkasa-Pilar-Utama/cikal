import { describe, expect, it } from "vitest";
import { ageInMonths, ageInYears } from "./applicant-age.js";

describe("applicant age", () => {
  it("AC-40.04 counts 21 full years on the 21st birthday", () => {
    expect(ageInYears("2005-10-20", "2026-10-20")).toBe(21);
  });

  it("AC-40.03 counts 20 years one day before the 21st birthday", () => {
    expect(ageInYears("2005-10-21", "2026-10-20")).toBe(20);
  });

  it("counts only full months", () => {
    expect(ageInMonths("1975-10-20", "2026-10-20")).toBe(612);
    expect(ageInMonths("1975-10-21", "2026-10-20")).toBe(611);
  });
});
