import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { writeLicenseKeyFiles } from "./key-files.js";

const root = mkdtempSync(join(tmpdir(), "cikal-license-keys-"));

describe("license key files", () => {
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("creates the key folder of keygen when it does not exist yet (DEPLOYMENT_PLAN §3.11)", () => {
    const paths = writeLicenseKeyFiles(join(root, "cikal-license-keys"));

    expect(readFileSync(paths.signingKey, "utf8")).toContain("BEGIN PRIVATE KEY");
    expect(readFileSync(paths.publicKey, "utf8")).toContain("BEGIN PUBLIC KEY");
  });

  it("never overwrites an existing key pair", () => {
    expect(() => writeLicenseKeyFiles(join(root, "cikal-license-keys"))).toThrow(/EEXIST/);
  });
});
