import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  errorEnvelopeSchema,
  type LicenseFile,
  licenseInstallResponseSchema,
  licenseResponseSchema,
  sessionResponseSchema,
} from "@cikal/contracts";
import { generateLicenseKeys, issueLicense } from "@cikal/license-cli";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { Licensing } from "../src/modules/core/tenancy/index.js";
import type { OpsSignal } from "../src/platform/migrate/runner.js";
import { listenOpsSignals } from "../src/platform/ops/ops-signals.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import {
  businessDateIn,
  installTestLicense,
  issueTestLicense,
  licenseUpload,
  testLicenseKeys,
  type UploadOptions,
} from "./support/license.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const COMPANY_002 = "0192b6a0-0002-7000-8000-000000000002";
const LICENSE_FILE_MAX_BYTES = 64 * 1024;
const NOTIFY_WAIT_MS = 500;
/** CLI penerbit lisensi hasil build `tools/license-cli` (US-100). */
const LICENSE_CLI = join(dirname(createRequire(import.meta.url).resolve("@cikal/license-cli")), "cli.js");

type Response = { statusCode: number; json(): unknown };
type InstallOptions = UploadOptions & { session?: TestSession; idempotencyKey?: string | null };

/** `GET /license` dan `POST /license` (api-specs 04 §4.1, §4.2) serta pemeriksaan lisensi LC-04. */
describe("license", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let superUser: TestSession;
  let keyDir: string;

  const json = (file: LicenseFile) => JSON.stringify(file);
  const getLicense = (session: TestSession = superUser) =>
    app.inject({ method: "GET", url: "/api/v1/license", headers: session.headers });
  const install = (content: string | Buffer, options: InstallOptions = {}) => {
    const upload = licenseUpload(content, options);
    const key = options.idempotencyKey === undefined ? uuidv7() : options.idempotencyKey;
    return app.inject({
      method: "POST",
      url: "/api/v1/license",
      payload: upload.payload,
      headers: {
        ...(options.session ?? superUser).headers,
        ...upload.headers,
        ...(key ? { "idempotency-key": key } : {}),
      },
    });
  };
  const sessionOf = async (session: TestSession) =>
    sessionResponseSchema.parse(
      (await app.inject({ method: "GET", url: "/api/v1/auth/session", headers: session.headers })).json(),
    ).data;
  const activeLicenseNumber = async () => licenseResponseSchema.parse((await getLicense()).json()).data.licenseNumber;
  const expectError = (res: Response, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  const replaceLicense = async (file: LicenseFile, tenantId?: string) => {
    await installTestLicense(db.owner, file, tenantId);
    app.get(Licensing).invalidate();
  };
  const issueWithCli = (number: string, modules: string): string => {
    const out = join(keyDir, `${number}.json`);
    execFileSync(process.execPath, [
      LICENSE_CLI,
      "issue",
      ...["--key", join(keyDir, "license-signing-key.pem"), "--number", number, "--company", "001"],
      ...["--deployment", "ON_PREMISE", "--modules", modules],
      ...["--valid-from", businessDateIn(0), "--valid-to", businessDateIn(400), "--out", out],
    ]);
    return readFileSync(out, "utf8");
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    superUser = await createSession(db.owner, { roleId: seedRoleIds.superUser });
    keyDir = mkdtempSync(join(tmpdir(), "cikal-license-"));
    writeFileSync(join(keyDir, "license-signing-key.pem"), testLicenseKeys.privateKey, { mode: 0o600 });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
    if (keyDir) rmSync(keyDir, { recursive: true, force: true });
  });

  it("shows the installed licence with its modules and validity on the License page (AC-100.01)", async () => {
    const res = await getLicense();

    expect(res.statusCode).toBe(200);
    const { data } = licenseResponseSchema.parse(res.json());
    expect(data).toMatchObject({ companyCode: "001", status: "ACTIVE", validTo: businessDateIn(365), maxUsers: null });
    expect(data.modules).toContainEqual({ moduleCode: "M06", moduleName: "Dedup" });
  });

  it("installs a licence file from the licence CLI and shows only licensed menus afterwards (AC-100.01)", async () => {
    const roleId = await createRole(db.owner, "Pengguna Lisensi", [
      { menuCode: "MST-PRODUCT", view: true },
      { menuCode: "MST-DEDUP", view: true },
    ]);
    const user = await createSession(db.owner, { roleId });
    const masterMenus = async () =>
      (await sessionOf(user)).menus.find((menu) => menu.menuCode === "MST")?.children.map((menu) => menu.menuCode);
    expect(await masterMenus()).toContain("MST-DEDUP");

    const res = await install(issueWithCli("PPU-LIC-2026-0101", "CORE,M07,M08,M09,M10,M11,M14,M15"));

    expect(res.statusCode).toBe(200);
    expect(licenseInstallResponseSchema.parse(res.json())).toEqual({
      data: {
        licenseNumber: "PPU-LIC-2026-0101",
        validTo: businessDateIn(400),
        modules: ["CORE", "M07", "M08", "M09", "M10", "M11", "M14", "M15"],
        modulesNotInPackage: ["M14"],
      },
      message: "License installed",
    });
    expect(await masterMenus()).toEqual(["MST-PRODUCT"]);
    expect((await sessionOf(user)).license.modules).toEqual(["CORE", "M07", "M08", "M09", "M10", "M11", "M15"]);
    expect(await activeLicenseNumber()).toBe("PPU-LIC-2026-0101");
  });

  it("rejects a licence file changed after issuing and keeps the previous licence (AC-100.02)", async () => {
    const before = await activeLicenseNumber();
    const file = issueTestLicense();
    const changed = { ...file, license: { ...file.license, validTo: businessDateIn(3650) } };

    expectError(await install(JSON.stringify(changed)), 422, "LICENSE_INVALID", "License file is invalid");
    expect(await activeLicenseNumber()).toBe(before);
  });

  it.each<[string, () => string | Buffer]>([
    ["signed with another key", () => json(issueLicense(issueTestLicense().license, generateLicenseKeys().privateKey))],
    ["for another company", () => json(issueTestLicense({ companyCode: "002" }))],
    [
      "whose validity has ended",
      () => json(issueTestLicense({ validFrom: businessDateIn(-30), validTo: businessDateIn(-1) })),
    ],
    ["that is not valid JSON", () => "{"],
    ["larger than 64 KB", () => json(issueTestLicense()).padEnd(LICENSE_FILE_MAX_BYTES + 1, " ")],
  ])("rejects a licence file %s with LICENSE_INVALID (AC-100.02)", async (_case, content) => {
    const before = await activeLicenseNumber();

    expectError(await install(content()), 422, "LICENSE_INVALID", "License file is invalid");
    expect(await activeLicenseNumber()).toBe(before);
  });

  it("rejects a licence number that was installed before, so a replaced licence cannot come back", async () => {
    const file = issueTestLicense();
    expect((await install(json(file))).statusCode).toBe(200);
    expect((await install(json(issueTestLicense()))).statusCode).toBe(200);

    expectError(await install(json(file)), 422, "LICENSE_INVALID", "License file is invalid");
  });

  it("rejects a file that is not JSON with UNSUPPORTED_FILE_TYPE", async () => {
    const res = await install(json(issueTestLicense()), { filename: "license.pdf", contentType: "application/pdf" });

    expectError(res, 415, "UNSUPPORTED_FILE_TYPE", "Allowed file types: json");
  });

  it("requires an Idempotency-Key with IDEMPOTENCY_KEY_REQUIRED", async () => {
    const res = await install(json(issueTestLicense()), { idempotencyKey: null });

    expectError(res, 400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required");
  });

  it("rejects a request without a licence file with VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/license",
      payload: {},
      headers: { ...superUser.headers, "idempotency-key": uuidv7() },
    });

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
  });

  it.each<[string, (boundary: string) => string]>([
    [
      "with two files",
      (b) => {
        const part = `--${b}\r\nContent-Disposition: form-data; name="file"; filename="license.json"\r\n\r\n{}\r\n`;
        return `${part}${part}--${b}--\r\n`;
      },
    ],
    ["that is cut off", (b) => `--${b}\r\nContent-Disposition: form-data; name="file"`],
  ])("rejects a multipart body %s with VALIDATION_FAILED", async (_case, body) => {
    const boundary = "cikal-test-boundary";
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/license",
      payload: body(boundary),
      headers: {
        ...superUser.headers,
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "idempotency-key": uuidv7(),
      },
    });

    expectError(res, 400, "VALIDATION_FAILED", "Please complete all required fields");
  });

  it("lets only a role with License Update install a licence (ACTION_DENIED)", async () => {
    const viewer = await createSession(db.owner, {
      roleId: await createRole(db.owner, "License Viewer", [{ menuCode: "SYS-LICENSE", view: true }]),
    });

    expect((await getLicense(viewer)).statusCode).toBe(200);
    expectError(
      await install(json(issueTestLicense()), { session: viewer }),
      403,
      "ACTION_DENIED",
      "You do not have permission to perform this action",
    );
  });

  it("records LICENSE_INSTALLED in the audit trail with the replaced licence number", async () => {
    const before = await activeLicenseNumber();
    const file = issueTestLicense();

    expect((await install(json(file))).statusCode).toBe(200);

    const { rows } = await db.owner.query(
      `select module, record_id, old_data, new_data from audit.audit_logs
        where action = 'LICENSE_INSTALLED' order by occurred_at desc, id desc limit 1`,
    );
    expect(rows[0]).toMatchObject({
      module: "License",
      record_id: file.license.licenseNumber,
      old_data: { licenseNumber: before },
      new_data: { licenseNumber: file.license.licenseNumber, validTo: file.license.validTo },
    });
  });

  it("tells every api and worker process to drop its licence cache once the install commits", async () => {
    const signals: OpsSignal[] = [];
    const stop = listenOpsSignals(db.appUrl, (signal) => signals.push(signal));
    await new Promise((resolve) => setTimeout(resolve, NOTIFY_WAIT_MS));

    expect((await install(json(issueTestLicense()))).statusCode).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, NOTIFY_WAIT_MS));
    await stop();

    expect(signals).toEqual(["license_installed"]);
  });

  it("keeps an expired licence readable but rejects data changes with LICENSE_EXPIRED until a new one is installed (LC-06)", async () => {
    const maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    await replaceLicense(issueTestLicense({ validFrom: businessDateIn(-400), validTo: businessDateIn(-1) }));
    const createProduct = () =>
      app.inject({ method: "POST", url: "/api/v1/products", payload: {}, headers: maker.headers });

    expect(licenseResponseSchema.parse((await getLicense()).json()).data.status).toBe("EXPIRED");
    expect((await app.inject({ method: "GET", url: "/api/v1/products", headers: maker.headers })).statusCode).toBe(200);
    expectError(
      await createProduct(),
      403,
      "LICENSE_EXPIRED",
      "License has expired. The application is in read-only mode",
    );

    expect((await install(json(issueTestLicense()))).statusCode).toBe(200);
    expect((await createProduct()).statusCode).toBe(400);
  });

  it("ignores a licence row changed directly in the database (LC-03)", async () => {
    await db.owner.query(
      `update tenancy.licenses set raw_document = jsonb_set(raw_document, '{license,modules}', raw_document #> '{license,modules}' || '["M12"]')
        where tenant_id = '0192b6a0-0001-7000-8000-000000000001' and status = 'ACTIVE'`,
    );
    app.get(Licensing).invalidate();

    expectError(await getLicense(), 404, "NOT_FOUND", "No license is installed");
    expect((await sessionOf(superUser)).license).toEqual({ status: "NONE", validTo: null, modules: [] });

    await replaceLicense(issueTestLicense());
  });

  it("lets a company without a licence install its first licence from the License page", async () => {
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [COMPANY_002],
    );
    const roleId = await createRole(
      db.owner,
      "Super User Bank Lain",
      [
        { menuCode: "SYS-LICENSE", view: true, update: true },
        { menuCode: "MST-PRODUCT", view: true, create: true },
      ],
      COMPANY_002,
    );
    const admin = await createSession(db.owner, { roleId, tenantId: COMPANY_002 });
    const products = (method: "GET" | "POST") =>
      app.inject({
        method,
        url: "/api/v1/products",
        headers: admin.headers,
        ...(method === "POST" ? { payload: {} } : {}),
      });

    expectError(await getLicense(admin), 404, "NOT_FOUND", "No license is installed");
    expectError(await products("GET"), 403, "MODULE_NOT_LICENSED", "You do not have access to this page");
    expectError(await products("POST"), 403, "MODULE_NOT_LICENSED", "You do not have access to this page");

    const res = await install(json(issueTestLicense({ companyCode: "002" })), { session: admin });

    expect(res.statusCode).toBe(200);
    expect((await products("GET")).statusCode).toBe(200);
  });
});
