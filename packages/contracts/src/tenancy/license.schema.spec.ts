import { describe, expect, it } from "vitest";
import { canonicalLicensePayload, type LicensePayload, licensePayloadSchema } from "./license.schema.js";

const payload: LicensePayload = {
  licenseNumber: "PPU-LIC-2026-0001",
  companyCode: "001",
  deploymentType: "ON_PREMISE",
  modules: ["CORE", "M06"],
  validFrom: "2026-10-21",
  validTo: "2027-12-31",
  maxUsers: null,
};

describe("license payload", () => {
  it("serialises the same payload to the same bytes whatever the key order", () => {
    const reordered = licensePayloadSchema.parse(Object.fromEntries(Object.entries(payload).reverse()));
    expect(canonicalLicensePayload(reordered)).toBe(canonicalLicensePayload(payload));
    expect(canonicalLicensePayload(payload)).toBe(
      '{"companyCode":"001","deploymentType":"ON_PREMISE","licenseNumber":"PPU-LIC-2026-0001","maxUsers":null,' +
        '"modules":["CORE","M06"],"validFrom":"2026-10-21","validTo":"2027-12-31"}',
    );
  });

  it("rejects a licence without CORE, with a repeated module, or with an unknown field", () => {
    expect(licensePayloadSchema.safeParse({ ...payload, modules: ["M06"] }).success).toBe(false);
    expect(licensePayloadSchema.safeParse({ ...payload, modules: ["CORE", "CORE"] }).success).toBe(false);
    expect(licensePayloadSchema.safeParse({ ...payload, plan: "gold" }).success).toBe(false);
  });

  it("rejects a validity period that ends before it starts", () => {
    expect(licensePayloadSchema.safeParse({ ...payload, validTo: "2026-10-20" }).success).toBe(false);
  });
});
