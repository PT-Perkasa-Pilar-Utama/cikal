import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { DocumentFiles, type UploadCandidate } from "../src/modules/core/document/index.js";
import { seedSystemParameterIds } from "../src/modules/core/masterdata/seed/system-parameters.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { DomainError } from "../src/platform/http/domain-error.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { megabytes, sampleExe, sampleJpg, samplePdf } from "./support/files.js";
import { CONVERTED_PDF, type FakeGotenberg, startFakeGotenberg } from "./support/gotenberg.js";
import { startStorage, type TestStorage } from "./support/storage.js";

const ACTOR = { tenantId: seedCompanyIds.company001, userId: "0192b6e0-0001-7000-8000-000000000001" };
const UPLOAD_MAX_MB_VALUE_ID = "0192b6e0-0001-7000-8000-000000000002";

/** `document.upload` (technical-specs 05 §5.9; api-specs 12 §12.7 langkah 2 s.d. 4) dengan PostgreSQL dan S3 asli. */
describe("document upload", () => {
  let db: TestDatabase;
  let storage: TestStorage;
  let gotenberg: FakeGotenberg;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    [db, storage, gotenberg] = await Promise.all([startDatabase("dev"), startStorage(), startFakeGotenberg()]);
    app = await createApp({ ...db.config, storage: storage.config, gotenbergUrl: gotenberg.url });
    await app.init();
  });

  afterEach(async () => {
    gotenberg.reset();
    await db.owner.query("delete from document.document_files");
    await db.owner.query("delete from masterdata.system_parameter_values where id = $1", [UPLOAD_MAX_MB_VALUE_ID]);
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all([db?.stop(), storage?.stop(), gotenberg?.stop()]);
  });

  const upload = (fileName: string, data: Buffer) => {
    const file: UploadCandidate = { fileName, data, truncated: false };
    return app.get(TenantTx).withTenantTx(ACTOR, (tx) => app.get(DocumentFiles).upload(tx, ACTOR, file));
  };
  const rejection = async (fileName: string, data: Buffer) => {
    const error = await upload(fileName, data).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DomainError);
    return error;
  };
  const storedRows = async () =>
    (
      await db.owner.query(
        `select id, tenant_id, file_name, original_extension, stored_format, size_bytes, storage_key, created_by
           from document.document_files`,
      )
    ).rows;

  it("AC-47.03 stores a PDF of exactly 2 MB as it is, under a key without the file name", async () => {
    const pdf = samplePdf(2_097_152);

    const stored = await upload("slip-gaji.pdf", pdf);

    expect(stored).toMatchObject({ fileName: "slip-gaji.pdf", sizeBytes: 2_097_152 });
    expect(await storedRows()).toEqual([
      {
        id: stored.fileId,
        tenant_id: ACTOR.tenantId,
        file_name: "slip-gaji.pdf",
        original_extension: "pdf",
        stored_format: "PDF",
        size_bytes: "2097152",
        storage_key: `tenants/${ACTOR.tenantId}/document/${stored.fileId}`,
        created_by: ACTOR.userId,
      },
    ]);
    expect((await storage.read(`tenants/${ACTOR.tenantId}/document/${stored.fileId}`)).equals(pdf)).toBe(true);
    expect(gotenberg.conversions).toBe(0);
  });

  it("converts an image to PDF through Gotenberg and keeps the uploaded name and size", async () => {
    const stored = await upload("ktp.jpg", sampleJpg());

    expect(gotenberg.conversions).toBe(1);
    const [row] = await storedRows();
    expect(row).toMatchObject({
      file_name: "ktp.jpg",
      original_extension: "jpg",
      size_bytes: String(sampleJpg().length),
    });
    expect((await storage.read(row.storage_key)).equals(CONVERTED_PDF)).toBe(true);
    expect(stored.uploadedAt).toBeInstanceOf(Date);
  });

  it("AC-47.02 rejects npwp.exe with 415 and stores nothing", async () => {
    expect(await rejection("npwp.exe", sampleExe())).toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
      status: 415,
      message: "Allowed file types: png, jpg, jpeg, pdf, docx",
    });
    expect(await storedRows()).toEqual([]);
    expect(gotenberg.conversions).toBe(0);
  });

  it("AC-47.04 rejects a PDF of 2.1 MB with 413 and stores nothing", async () => {
    expect(await rejection("slip-gaji.pdf", samplePdf(megabytes(2.1)))).toMatchObject({
      code: "FILE_TOO_LARGE",
      status: 413,
      message: "File must not exceed 2 MB",
    });
    expect(await storedRows()).toEqual([]);
  });

  it("applies the tenant UPLOAD_MAX_MB value instead of the 2 MB default", async () => {
    await db.owner.query(
      `insert into masterdata.system_parameter_values (id, tenant_id, definition_id, value, version_number, status, effective_from)
       values ($1, $2, $3, '3', 1, 'ACTIVE', now())`,
      [UPLOAD_MAX_MB_VALUE_ID, ACTOR.tenantId, seedSystemParameterIds.uploadMaxMb],
    );

    await expect(upload("slip-gaji.pdf", samplePdf(megabytes(2.1)))).resolves.toMatchObject({
      fileName: "slip-gaji.pdf",
    });
    expect(await rejection("slip-gaji.pdf", samplePdf(megabytes(3.1)))).toMatchObject({
      code: "FILE_TOO_LARGE",
      message: "File must not exceed 3 MB",
    });
  });

  it("answers 503 SERVICE_UNAVAILABLE when the PDF converter fails, and stores nothing", async () => {
    gotenberg.healthy = false;

    expect(await rejection("ktp.jpg", sampleJpg())).toMatchObject({ code: "SERVICE_UNAVAILABLE", status: 503 });
    expect(await storedRows()).toEqual([]);
  });
});
