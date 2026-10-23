import { errorEnvelopeSchema, fileDownloadUrlResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { DocumentFiles, FileAccessRegistry } from "../src/modules/core/document/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { sampleJpg } from "./support/files.js";
import { CONVERTED_PDF, type FakeGotenberg, startFakeGotenberg } from "./support/gotenberg.js";
import { createSession, type TestSession } from "./support/session.js";
import { startStorage, type TestStorage } from "./support/storage.js";

const COMPANY_002 = "0192b6e1-0002-7000-8000-000000000001";
const OTHER_TENANT_FILE = "0192b6e1-0002-7000-8000-000000000002";
const UNKNOWN_FILE = "0192b6e1-ffff-7000-8000-000000000001";
const TTL_MS = 5 * 60 * 1000;

type Response = { statusCode: number; body: string; json(): unknown };

/** `GET /files/{fileId}/download-url` (api-specs 10 §10.1, technical-specs 07 §7.7). */
describe("file download url", () => {
  let db: TestDatabase;
  let storage: TestStorage;
  let gotenberg: FakeGotenberg;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let fileId: string;
  /** File yang diizinkan aturan pemilik uji; aturan asli didaftarkan modul pemilik (BE-S3-03). */
  const viewable = new Set<string>();

  beforeAll(async () => {
    [db, storage, gotenberg] = await Promise.all([startDatabase("dev"), startStorage(), startFakeGotenberg()]);
    app = await createApp({ ...db.config, storage: storage.config, gotenbergUrl: gotenberg.url });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    app.get(FileAccessRegistry).register({ canView: async (_tx, _ctx, id) => viewable.has(id) });
    sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
    const actor = { tenantId: seedCompanyIds.company001, userId: sales.userId };
    const file = { fileName: "ktp.jpg", data: sampleJpg(), truncated: false };
    fileId = (await app.get(TenantTx).withTenantTx(actor, (tx) => app.get(DocumentFiles).upload(tx, actor, file)))
      .fileId;
    viewable.add(fileId);
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all([db?.stop(), storage?.stop(), gotenberg?.stop()]);
  });

  const downloadUrl = (id: string, query = "", headers: Record<string, string> = sales.headers) =>
    app.inject({ method: "GET", url: `/api/v1/files/${id}/download-url${query}`, headers });
  const expectNotFound = (res: Response) => {
    expect(res.statusCode, res.body).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  };

  it("returns a URL signed for 5 minutes, with inline PDF response headers, that serves the stored PDF", async () => {
    const before = Date.now();
    const res = await downloadUrl(fileId);

    expect(res.statusCode, res.body).toBe(200);
    const { data } = fileDownloadUrlResponseSchema.parse(res.json());
    expect(data).toMatchObject({ fileName: "ktp.pdf", contentType: "application/pdf", sizeBytes: sampleJpg().length });
    const expiresAt = Date.parse(data.expiresAt);
    expect(expiresAt).toBeGreaterThanOrEqual(before + TTL_MS);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + TTL_MS);
    const url = new URL(data.url);
    expect(url.origin).toBe(storage.config.endpoint);
    expect(url.pathname).toBe(`/${storage.config.bucket}/tenants/${seedCompanyIds.company001}/document/${fileId}`);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("response-content-type")).toBe("application/pdf");
    expect(url.searchParams.get("response-content-disposition")).toBe(
      `inline; filename="ktp.pdf"; filename*=UTF-8''ktp.pdf`,
    );

    const object = await fetch(data.url);
    expect(object.status).toBe(200);
    expect(object.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await object.arrayBuffer()).equals(CONVERTED_PDF)).toBe(true);
  });

  it("signs the response headers for an attachment download when disposition=attachment", async () => {
    const res = await downloadUrl(fileId, "?disposition=attachment");

    const { data } = fileDownloadUrlResponseSchema.parse(res.json());
    expect(new URL(data.url).searchParams.get("response-content-disposition")).toMatch(
      /^attachment; filename="ktp.pdf"/,
    );
    expect((await fetch(data.url)).status).toBe(200);
  });

  it("keeps the bucket private: the object is refused without a valid signature", async () => {
    const { data } = fileDownloadUrlResponseSchema.parse((await downloadUrl(fileId)).json());
    const url = new URL(data.url);

    expect((await fetch(`${url.origin}${url.pathname}`)).status).toBe(403);
    url.searchParams.set("X-Amz-Signature", "0".repeat(64));
    expect((await fetch(url)).status).toBe(403);
  });

  it("records a VIEW_DOCUMENT data access audit for each URL", async () => {
    await downloadUrl(fileId);

    const { rows } = await db.owner.query(
      "select module, action, user_id, description from audit.audit_logs where record_id = $1 order by created_at desc",
      [fileId],
    );
    expect(rows[0]).toEqual({
      module: "Document",
      action: "VIEW_DOCUMENT",
      user_id: sales.userId,
      description: "File ktp.pdf viewed",
    });
  });

  it("answers 404 NOT_FOUND when no owner module lets the user view the file", async () => {
    viewable.delete(fileId);
    try {
      expectNotFound(await downloadUrl(fileId));
    } finally {
      viewable.add(fileId);
    }
  });

  it("answers 404 NOT_FOUND for an unknown file", async () => {
    viewable.add(UNKNOWN_FILE);
    expectNotFound(await downloadUrl(UNKNOWN_FILE));
  });

  it("answers 404 NOT_FOUND for a file of another company", async () => {
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [COMPANY_002],
    );
    await db.owner.query(
      `insert into document.document_files (id, tenant_id, file_name, original_extension, stored_format, size_bytes, storage_key)
       values ($1, $2, 'ktp.pdf', 'pdf', 'PDF', 10, $3)`,
      [OTHER_TENANT_FILE, COMPANY_002, `tenants/${COMPANY_002}/document/${OTHER_TENANT_FILE}`],
    );
    viewable.add(OTHER_TENANT_FILE);

    expectNotFound(await downloadUrl(OTHER_TENANT_FILE));
  });

  it("answers 401 UNAUTHENTICATED without a session", async () => {
    const res = await downloadUrl(fileId, "", {});

    expect(res.statusCode, res.body).toBe(401);
  });

  it("answers 400 VALIDATION_FAILED for an unknown disposition", async () => {
    const res = await downloadUrl(fileId, "?disposition=download");

    expect(res.statusCode, res.body).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
