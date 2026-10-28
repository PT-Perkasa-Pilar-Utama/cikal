import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type LicenseFile, sessionResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { readLicenseFile } from "../src/modules/core/tenancy/index.js";
import { type CreateAdminRequest, createAdmin } from "../src/platform/migrate/create-admin.js";
import { installedModuleData } from "../src/platform/migrate/installed-modules.js";
import { licenseFileInstaller } from "../src/platform/migrate/license-file.js";
import { resetState } from "../src/platform/migrate/runner.js";
import { seedContext, startDatabase, type TestDatabase } from "./support/database.js";
import { issueTestLicense, testLicenseKeys } from "./support/license.js";
import { login } from "./support/login.js";
import { TEST_MASTER_KEY } from "./support/test-config.js";

/**
 * Pemasangan lisensi tanpa halaman License (DEPLOYMENT_PLAN §3.6 dan F-09): `create-admin` pada instalasi baru yang
 * hanya berisi seed `base`, dan `LICENSE_FILE` yang dipasang ulang setiap reset.
 */
describe("license installation from LICENSE_FILE", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let dir: string;
  const firstLicense = issueTestLicense({ licenseNumber: "PPU-LIC-2026-0201", modules: ["CORE", "M07", "M15"] });

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "cikal-license-"));
    db = await startDatabase("base");
    app = await createApp(db.config);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  const licenseFile = (name: string, content: unknown): string => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(content));
    return path;
  };
  const request = (overrides: Partial<CreateAdminRequest> = {}): CreateAdminRequest => ({
    license: firstLicense,
    masterKey: TEST_MASTER_KEY,
    username: "admin",
    fullName: "Administrator",
    email: "admin@bankcontoh.co.id",
    companyName: "Bank Contoh",
    address: "Jl. Jenderal Sudirman Kav. 1, Jakarta Pusat",
    ...overrides,
  });

  it("refuses a license file whose content was changed after issuing", () => {
    const tampered: LicenseFile = { ...firstLicense, license: { ...firstLicense.license, validTo: "2099-12-31" } };

    expect(() => readLicenseFile(licenseFile("tampered.json", tampered), testLicenseKeys.publicKey)).toThrow(
      "License file is invalid",
    );
  });

  it("refuses to create a new company without its name and address", async () => {
    await expect(createAdmin(db.owner, request({ companyName: null, address: null }))).rejects.toThrow(
      "Company 001 does not exist yet: --company-name and --address are required",
    );
    const { rows } = await db.owner.query("select count(*)::int as count from tenancy.companies");
    expect(rows).toEqual([{ count: 0 }]);
  });

  it("AC-100.01 installs the license file and gives the first admin the licensed modules after login", async () => {
    const license = readLicenseFile(licenseFile("license.json", firstLicense), testLicenseKeys.publicKey);

    const admin = await createAdmin(db.owner, request({ license }));

    expect(admin).toMatchObject({ companyCode: "001", username: "admin", licenseInstalled: true });
    const loggedIn = await login(app, "admin", admin.oneTimePassword);
    expect(loggedIn.status).toBe(200);
    const res = await app.inject({ method: "GET", url: "/api/v1/auth/session", headers: loggedIn.headers });
    const { data } = sessionResponseSchema.parse(res.json());
    expect(data.user).toMatchObject({ username: "admin", roleName: "Super User" });
    expect(data.company).toMatchObject({ companyCode: "001", companyName: "Bank Contoh" });
    expect(data.mustChangePassword).toBe(true);
    expect(data.license).toMatchObject({ status: "ACTIVE", modules: ["CORE", "M07", "M15"] });
    expect(data.menus.map((menu) => menu.menuCode)).toContain("SYS");
    const { rows } = await db.owner.query(
      "select key_purpose from platform.tenant_keys t join tenancy.companies c on c.id = t.tenant_id order by 1",
    );
    expect(rows).toEqual([{ key_purpose: "BLIND_INDEX" }, { key_purpose: "ENCRYPTION" }]);
  });

  it("keeps the active license and refuses a second admin with the same username", async () => {
    await expect(createAdmin(db.owner, request())).rejects.toThrow("Username admin already exists");

    const admin = await createAdmin(
      db.owner,
      request({ username: "admin.kedua", email: "admin.kedua@bankcontoh.co.id", companyName: null, address: null }),
    );

    expect(admin.licenseInstalled).toBe(false);
    const { rows } = await db.owner.query(
      "select count(*)::int as count from iam.roles where role_name = 'Super User'",
    );
    expect(rows).toEqual([{ count: 1 }]);
  });

  it("TL-S6-01 installs LICENSE_FILE again after a reset in place of the seed license", async () => {
    const path = licenseFile("reset.json", issueTestLicense({ licenseNumber: "PPU-LIC-2026-0202" }));

    await resetState({
      appEnv: "test",
      pool: db.owner,
      modules: installedModuleData,
      appRole: "cikal_app",
      seed: "dev",
      seedContext,
      emptyBucket: async () => 0,
      installLicense: licenseFileInstaller(db.owner, path, testLicenseKeys.publicKey),
    });

    const { rows } = await db.owner.query(
      "select license_number, status from tenancy.licenses order by license_number",
    );
    expect(rows).toEqual([
      { license_number: "PPU-LIC-2026-0202", status: "ACTIVE" },
      { license_number: "PPU-LIC-DEV-0001", status: "REVOKED" },
    ]);
  });
});
