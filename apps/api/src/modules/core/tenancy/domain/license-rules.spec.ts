import type { LicensePayload } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { isInstallable, isJsonFile, licenseStatus, packagedModules } from "./license-rules.js";

const license: LicensePayload = {
  licenseNumber: "PPU-LIC-2026-0001",
  companyCode: "001",
  deploymentType: "ON_PREMISE",
  modules: ["CORE", "M06", "M14"],
  validFrom: "2026-10-21",
  validTo: "2027-12-31",
  maxUsers: null,
};
const facts = { companyCode: "001", today: "2026-10-23", alreadyInstalled: false };

describe("licence rules (api-specs 04 §4.2)", () => {
  it("installs a licence of the session company that is still valid", () => {
    expect(isInstallable(license, facts)).toBe(true);
    expect(isInstallable(license, { ...facts, today: "2027-12-31" })).toBe(true);
  });

  it("refuses a licence of another company, past its validity, or installed before (AC-100.02)", () => {
    expect(isInstallable(license, { ...facts, companyCode: "002" })).toBe(false);
    expect(isInstallable(license, { ...facts, today: "2028-01-01" })).toBe(false);
    expect(isInstallable(license, { ...facts, alreadyInstalled: true })).toBe(false);
  });

  it("reports EXPIRED from the day after validTo (LC-06)", () => {
    expect(licenseStatus(license, "2027-12-31")).toBe("ACTIVE");
    expect(licenseStatus(license, "2028-01-01")).toBe("EXPIRED");
  });

  it("keeps only licensed modules that the package contains (PK-04)", () => {
    expect(packagedModules(license, new Set(["CORE", "M06", "M15"]))).toEqual(["CORE", "M06"]);
  });

  it("accepts a JSON file by MIME type or by extension", () => {
    expect(isJsonFile({ filename: "license.bin", mimetype: "application/json" })).toBe(true);
    expect(isJsonFile({ filename: "LICENSE.JSON", mimetype: "application/octet-stream" })).toBe(true);
    expect(isJsonFile({ filename: "license.pdf", mimetype: "application/pdf" })).toBe(false);
  });
});
