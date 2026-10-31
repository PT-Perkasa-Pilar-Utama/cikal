import { describe, expect, it } from "vitest";
import { formSteps, stepAfter } from "./form-steps.js";

describe("form steps", () => {
  it("AC-50.06 TRM_STP_001 orders KTA, Belum Kawin, Karyawan Swasta as Application to Emergency Contact", () => {
    expect(formSteps({ productCategory: "NON_COLLATERAL", married: false, selfEmployed: false })).toEqual([
      "application",
      "personal",
      "occupation",
      "documents",
      "emergency-contact",
    ]);
  });

  it("AC-50.06 TRM_STP_002 adds Spouse after Personal for KTA, Kawin, Karyawan Swasta", () => {
    expect(formSteps({ productCategory: "NON_COLLATERAL", married: true, selfEmployed: false })).toEqual([
      "application",
      "personal",
      "spouse",
      "occupation",
      "documents",
      "emergency-contact",
    ]);
  });

  it("AC-50.06 TRM_STP_003 adds Spouse, Business, and Collateral for Kredit Agunan, Kawin, Wiraswasta", () => {
    expect(formSteps({ productCategory: "COLLATERAL", married: true, selfEmployed: true })).toEqual([
      "application",
      "personal",
      "spouse",
      "occupation",
      "business",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });

  it("AC-50.06 TRM_STP_004 adds Business and Collateral for KUR Kecil, Belum Kawin, Wiraswasta", () => {
    expect(formSteps({ productCategory: "COLLATERAL", married: false, selfEmployed: true })).toEqual([
      "application",
      "personal",
      "occupation",
      "business",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });

  it("AC-50.06 TRM_STP_005 adds only Collateral for KPR, Cerai Hidup, ASN", () => {
    expect(formSteps({ productCategory: "COLLATERAL", married: false, selfEmployed: false })).toEqual([
      "application",
      "personal",
      "occupation",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });

  it("AC-50.06 TRM_STP_006 adds Spouse and Collateral for Pension, Kawin, Pensiunan", () => {
    expect(formSteps({ productCategory: "PENSION", married: true, selfEmployed: false })).toEqual([
      "application",
      "personal",
      "spouse",
      "occupation",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });

  it("moves Next to the following step and ends after Emergency Contact", () => {
    const steps = formSteps({ productCategory: "COLLATERAL", married: true, selfEmployed: true });

    expect(stepAfter(steps, "personal")).toBe("spouse");
    expect(stepAfter(steps, "business")).toBe("collateral");
    expect(stepAfter(steps, "emergency-contact")).toBeNull();
  });

  it("returns no next step for a section that is not in the steps", () => {
    const steps = formSteps({ productCategory: "NON_COLLATERAL", married: false, selfEmployed: false });

    expect(stepAfter(steps, "spouse")).toBeNull();
  });
});
