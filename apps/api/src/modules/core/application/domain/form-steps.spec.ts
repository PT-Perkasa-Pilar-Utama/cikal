import { describe, expect, it } from "vitest";
import { formSteps, stepAfter } from "./form-steps.js";

describe("form steps", () => {
  it("AC-50.06 TRM_STP_001 orders KTA, Belum Kawin, Karyawan Swasta as Application to Emergency Contact", () => {
    expect(formSteps()).toEqual(["application", "personal", "occupation", "documents", "emergency-contact"]);
  });

  it("moves Next from Occupation to Document and ends after Emergency Contact", () => {
    expect(stepAfter("occupation")).toBe("documents");
    expect(stepAfter("emergency-contact")).toBeNull();
  });
});
