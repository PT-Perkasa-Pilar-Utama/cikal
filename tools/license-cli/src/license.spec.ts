import type { LicensePayload } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { checkLicense, generateLicenseKeys, issueLicense } from "./license.js";

const keys = generateLicenseKeys();
const payload: LicensePayload = {
  licenseNumber: "PPU-LIC-2026-0001",
  companyCode: "001",
  deploymentType: "ON_PREMISE",
  modules: ["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M14", "M15"],
  validFrom: "2026-10-21",
  validTo: "2027-12-31",
  maxUsers: null,
};

describe("license issuer", () => {
  it("issues a file whose signature checks out with the matching public key (AC-100.01)", () => {
    expect(checkLicense(issueLicense(payload, keys.privateKey), keys.publicKey)).toEqual(payload);
  });

  it("rejects a file whose content was changed after issuing (AC-100.02)", () => {
    const file = issueLicense(payload, keys.privateKey);
    const changed = { ...file, license: { ...file.license, validTo: "2099-12-31" } };
    expect(checkLicense(changed, keys.publicKey)).toBeNull();
  });

  it("rejects a file signed with another key", () => {
    const other = generateLicenseKeys();
    expect(checkLicense(issueLicense(payload, other.privateKey), keys.publicKey)).toBeNull();
  });

  it("refuses to sign a licence without CORE", () => {
    expect(() => issueLicense({ ...payload, modules: ["M06"] }, keys.privateKey)).toThrow();
  });
});
