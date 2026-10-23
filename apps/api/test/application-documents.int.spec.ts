import {
  applicationDocumentsResponseSchema,
  applicationFormResponseSchema,
  documentUploadResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import {
  availableProduct,
  insertChecklist,
  occupationBody,
  personalBody,
  SEVEN_MANDATORY_DOCUMENTS,
  sectionClient,
} from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { megabytes, sampleExe, sampleJpg, samplePdf } from "./support/files.js";
import { type FakeGotenberg, startFakeGotenberg } from "./support/gotenberg.js";
import { licenseUpload } from "./support/license.js";
import { expectError } from "./support/route.js";
import { createRole, createSession, type TestSession } from "./support/session.js";
import { startStorage, type TestStorage } from "./support/storage.js";

const CHECKLIST = [
  ...SEVEN_MANDATORY_DOCUMENTS.map((documentType) => ({ documentType, isMandatory: true })),
  { documentType: "BPJS", isMandatory: false },
];

/** Slot dan unggah dokumen step "Document" (api-specs 12 §12.6, §12.7; AC-25.04, AC-25.05, AC-47.x). */
describe("application documents", () => {
  let db: TestDatabase;
  let storage: TestStorage;
  let gotenberg: FakeGotenberg;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let otherSales: TestSession;
  let productId: string;
  let client: ReturnType<typeof sectionClient>;

  beforeAll(async () => {
    [db, storage, gotenberg] = await Promise.all([startDatabase("dev"), startStorage(), startFakeGotenberg()]);
    app = await createApp({ ...db.config, storage: storage.config, gotenbergUrl: gotenberg.url });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const role = await createRole(db.owner, "Sales Dokumen", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    otherSales = await createSession(db.owner, { roleId: role });
    productId = await availableProduct(db.owner);
    await insertChecklist(db.owner, productId, CHECKLIST);
    client = sectionClient(app);
  });

  afterEach(() => gotenberg.reset());

  afterAll(async () => {
    await app?.close();
    await Promise.all([db?.stop(), storage?.stop(), gotenberg?.stop()]);
  });

  /** Draft Karyawan Swasta, Belum Kawin sampai step Occupation. */
  const draft = async (product = productId) => {
    const id = await client.createDraft(sales, product);
    await client.save(sales, id, "personal", personalBody());
    await client.save(sales, id, "occupation", occupationBody);
    return id;
  };
  const list = (session: TestSession, id: string) =>
    app.inject({ method: "GET", url: `/api/v1/applications/${id}/documents`, headers: session.headers });
  const slots = async (id: string) => {
    const res = await list(sales, id);
    expect(res.statusCode, res.body).toBe(200);
    return applicationDocumentsResponseSchema.parse(res.json()).data;
  };
  const upload = (id: string, documentType: string, filename: string, data: Buffer, contentType: string) => {
    const multipart = licenseUpload(data, { filename, contentType });
    return app.inject({
      method: "PUT",
      url: `/api/v1/applications/${id}/documents/${documentType}`,
      headers: { ...sales.headers, ...multipart.headers },
      payload: multipart.payload,
    });
  };
  const uploaded = async (id: string, documentType: string, filename: string, data = sampleJpg()) => {
    const res = await upload(id, documentType, filename, data, "image/jpeg");
    expect(res.statusCode, res.body).toBe(200);
    return documentUploadResponseSchema.parse(res.json()).data;
  };

  it("AC-25.04 shows the upload slots of the matching checklist", async () => {
    const id = await draft();

    const view = await slots(id);

    expect(view.slots.map((slot) => slot.documentType)).toEqual([...SEVEN_MANDATORY_DOCUMENTS, "BPJS"]);
    expect(view.slots[3]).toEqual({
      documentType: "SLIP_GAJI",
      label: "Slip Gaji",
      isMandatory: true,
      file: null,
      verificationStatus: "PENDING",
    });
  });

  it("AC-47.06 labels BPJS optional and leaves it out of the 0 of 7 count", async () => {
    const id = await draft();

    const view = await slots(id);

    expect(view.slots.find((slot) => slot.documentType === "BPJS")?.isMandatory).toBe(false);
    expect(view.completeness).toEqual({ uploadedMandatory: 0, requiredMandatory: 7 });
  });

  it("AC-25.05 answers that no checklist is configured for the combination", async () => {
    const id = await draft(await availableProduct(db.owner));

    expectError(
      await list(sales, id),
      422,
      "CHECKLIST_NOT_CONFIGURED",
      "No document checklist is configured for this product. Please contact your administrator",
    );
  });

  it("AC-47.01 uploads ktp.jpg of 800 KB to the KTP slot and counts 1 of 7", async () => {
    const id = await draft();
    const data = Buffer.concat([sampleJpg(), Buffer.alloc(800 * 1024 - sampleJpg().length)]);

    const result = await uploaded(id, "KTP", "ktp.jpg", data);

    expect(result).toEqual({
      documentType: "KTP",
      file: { fileId: expect.any(String), fileName: "ktp.jpg", sizeBytes: data.length, uploadedAt: expect.any(String) },
      completeness: { uploadedMandatory: 1, requiredMandatory: 7 },
    });
    expect(gotenberg.conversions).toBe(1);
    expect((await slots(id)).slots[0]?.file?.fileName).toBe("ktp.jpg");
    const form = await app.inject({ method: "GET", url: `/api/v1/applications/${id}/form`, headers: sales.headers });
    expect(applicationFormResponseSchema.parse(form.json()).data.documentCompleteness).toEqual({
      uploadedMandatory: 1,
      requiredMandatory: 7,
    });
  });

  it("AC-47.05 replaces the KTP file and no longer uses the old file", async () => {
    const id = await draft();
    const old = await uploaded(id, "KTP", "ktp.jpg");

    const replaced = await uploaded(id, "KTP", "ktp-baru.jpg");

    const slot = (await slots(id)).slots[0];
    expect(slot?.file).toMatchObject({ fileId: replaced.file.fileId, fileName: "ktp-baru.jpg" });
    expect(replaced.completeness.uploadedMandatory).toBe(1);
    const { rows } = await db.owner.query(
      "select count(*)::int as total from application.application_documents where file_id = $1",
      [old.file.fileId],
    );
    expect(rows[0]?.total).toBe(0);
    const view = await app.inject({
      method: "GET",
      url: `/api/v1/files/${replaced.file.fileId}/download-url`,
      headers: sales.headers,
    });
    expect(view.statusCode, view.body).toBe(200);
  });

  it("rejects a document type outside the checklist (BUSINESS_RULE_VIOLATION)", async () => {
    const id = await draft();

    expectError(
      await upload(id, "SERTIFIKAT", "sertifikat.pdf", samplePdf(), "application/pdf"),
      422,
      "BUSINESS_RULE_VIOLATION",
      "Document type is not in the checklist",
    );
  });

  it("rejects an exe file (UNSUPPORTED_FILE_TYPE) and a 2.1 MB PDF (FILE_TOO_LARGE)", async () => {
    const id = await draft();

    expectError(
      await upload(id, "NPWP", "npwp.exe", sampleExe(), "application/octet-stream"),
      415,
      "UNSUPPORTED_FILE_TYPE",
      "Allowed file types: png, jpg, jpeg, pdf, docx",
    );
    expectError(
      await upload(id, "SLIP_GAJI", "slip.pdf", samplePdf(megabytes(2.1)), "application/pdf"),
      413,
      "FILE_TOO_LARGE",
      "File must not exceed 2 MB",
    );
  });

  it("answers SERVICE_UNAVAILABLE when the PDF converter fails", async () => {
    const id = await draft();
    gotenberg.healthy = false;

    expectError(
      await upload(id, "KTP", "ktp.jpg", sampleJpg(), "image/jpeg"),
      503,
      "SERVICE_UNAVAILABLE",
      "Service is temporarily unavailable",
    );
  });

  it("refuses uploads after submit (INVALID_STATE) and hides the draft from another Sales (NOT_FOUND)", async () => {
    const id = await draft();
    expectError(await list(otherSales, id), 404, "NOT_FOUND", "Data not found");
    await db.owner.query("update application.applications set status = 'ON_PROGRESS' where id = $1", [id]);

    expectError(
      await upload(id, "KTP", "ktp.jpg", sampleJpg(), "image/jpeg"),
      409,
      "INVALID_STATE",
      "This action is not allowed in the current status",
    );
  });
});
