import { createPublicKey } from "node:crypto";
import { describe, expect, it } from "vitest";
import { licensePublicKeyPem } from "../../../../license-public-key.generated.js";
import { devLicenseFile } from "../seed/dev-license.js";
import { verifyLicenseDocument } from "./license-verification.js";

const devKey = createPublicKey(licensePublicKeyPem);

describe("verifyLicenseDocument (technical-specs 07 §7.6)", () => {
  it("accepts the seeded dev licence with the public key embedded in the dev build", () => {
    expect(verifyLicenseDocument(devLicenseFile, devKey)?.license.licenseNumber).toBe("PPU-LIC-DEV-0001");
  });

  it("rejects the dev licence once a module is added to it (AC-100.02)", () => {
    const changed = { ...devLicenseFile, license: { ...devLicenseFile.license, modules: ["CORE", "M12"] } };
    expect(verifyLicenseDocument(changed, devKey)).toBeNull();
  });

  it("rejects a document that is not a licence file", () => {
    expect(verifyLicenseDocument({ license: devLicenseFile.license }, devKey)).toBeNull();
    expect(verifyLicenseDocument("not a licence", devKey)).toBeNull();
  });
});
