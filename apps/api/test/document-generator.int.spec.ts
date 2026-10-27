import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import PizZip from "pizzip";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { DocumentGenerator, type GenerateDocument, seedTemplateIds } from "../src/modules/core/document/index.js";
import { wordDocument } from "../src/modules/core/document/seed/akad-template.js";
import { seedProductIds } from "../src/modules/core/product/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { DomainError } from "../src/platform/http/domain-error.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { CONVERTED_PDF, type FakeGotenberg, startFakeGotenberg } from "./support/gotenberg.js";
import { startStorage, type TestStorage } from "./support/storage.js";

const ACTOR = { tenantId: seedCompanyIds.company001, userId: "0192b6e0-0001-7000-8000-000000000001" };
const PRODUCT_FILE_ID = "0192b6cb-0101-7000-8000-000000000001";
const PRODUCT_TEMPLATE_ID = "0192b6cb-0102-7000-8000-000000000001";

const AKAD_DATA = {
  contractNumber: "011/PK/2026/000001",
  contractDate: "20-10-2026",
  loanId: "20102026KTAQA0000041",
  customerName: "Budi Santoso",
  productName: "KTA QA",
  plafond: "Rp 150.000.000",
  tenor: "36",
  interestRate: "9,5%",
  installment: "Rp 4.804.000",
  paymentMethod: "Auto Debet",
  bankAccountNumber: "1234567890",
  customerAccountNumber: "0987654321",
  riskManagerName: "Rina Wijaya",
};

const bodyText = (docx: Buffer | null): string =>
  docx ? (new PizZip(docx).file("word/document.xml")?.asText() ?? "").replace(/<[^>]+>/g, "") : "";

/** `document.generate` (technical-specs 05 §5.9; api-specs 25 §25.3) dengan PostgreSQL dan S3 asli. */
describe("document generator", () => {
  let db: TestDatabase;
  let storage: TestStorage;
  let gotenberg: FakeGotenberg;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    [storage, gotenberg] = await Promise.all([startStorage(), startFakeGotenberg()]);
    db = await startDatabase("qa", storage.putObject);
    app = await createApp({ ...db.config, storage: storage.config, gotenbergUrl: gotenberg.url });
    await app.init();
  });

  afterEach(async () => {
    gotenberg.reset();
    await db.owner.query("delete from document.document_templates where id = $1", [PRODUCT_TEMPLATE_ID]);
    await db.owner.query(
      "delete from document.document_files where id not in (select file_id from document.document_templates)",
    );
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all([db?.stop(), storage?.stop(), gotenberg?.stop()]);
  });

  const generate = (request: Partial<GenerateDocument> = {}) =>
    app.get(TenantTx).withTenantTx(ACTOR, (tx) =>
      app.get(DocumentGenerator).generate(tx, ACTOR, {
        documentCode: "AKAD-KTAQA",
        productId: seedProductIds.ktaQa,
        fileName: "Surat Perjanjian Kredit 20102026KTAQA0000041.pdf",
        data: AKAD_DATA,
        ...request,
      }),
    );
  const rejection = async (request: Partial<GenerateDocument>) => {
    const error = await generate(request).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DomainError);
    return error;
  };
  const generatedRows = async () =>
    (
      await db.owner.query(
        `select id, file_name, original_extension, stored_format, storage_key from document.document_files
          where id not in (select file_id from document.document_templates)`,
      )
    ).rows;

  it("AC-77.01 fills the seed akad template with the application data and stores the Gotenberg PDF", async () => {
    const stored = await generate();

    expect(stored).toMatchObject({ fileName: "Surat Perjanjian Kredit 20102026KTAQA0000041.pdf" });
    const sent = bodyText(gotenberg.lastFile);
    expect(sent).toContain("SURAT PERJANJIAN KREDIT");
    expect(sent).toContain("Nomor: 011/PK/2026/000001");
    expect(sent).toContain("Nama Debitur: Budi Santoso");
    expect(sent).toContain("Risk Manager: Rina Wijaya");
    expect(sent).not.toContain("{{");
    const key = `tenants/${ACTOR.tenantId}/document/${stored.fileId}`;
    expect(await generatedRows()).toEqual([
      {
        id: stored.fileId,
        file_name: "Surat Perjanjian Kredit 20102026KTAQA0000041.pdf",
        original_extension: "docx",
        stored_format: "PDF",
        storage_key: key,
      },
    ]);
    expect((await storage.read(key)).equals(CONVERTED_PDF)).toBe(true);
  });

  it("AC-77.01 prefers the product's own template over the template for all products", async () => {
    const key = `tenants/${ACTOR.tenantId}/document/${PRODUCT_FILE_ID}`;
    const docx = wordDocument(["Akad khusus produk {{loanId}}"]);
    await storage.putObject({ key, body: docx, contentType: "application/octet-stream" });
    await db.owner.query(
      `insert into document.document_files (id, tenant_id, file_name, original_extension, stored_format, size_bytes, storage_key)
       values ($1, $2, 'akad-produk.docx', 'docx', 'DOCX', $3, $4)`,
      [PRODUCT_FILE_ID, ACTOR.tenantId, docx.length, key],
    );
    await db.owner.query(
      `insert into document.document_templates (id, tenant_id, document_code, product_id, file_id, placeholders)
       values ($1, $2, 'AKAD-KTAQA', $3, $4, '["loanId"]')`,
      [PRODUCT_TEMPLATE_ID, ACTOR.tenantId, seedProductIds.ktaQa, PRODUCT_FILE_ID],
    );

    await generate();

    expect(bodyText(gotenberg.lastFile)).toBe("Akad khusus produk 20102026KTAQA0000041");
  });

  it("AC-77.03 refuses a document code without a template with TEMPLATE_NOT_AVAILABLE", async () => {
    const error = await rejection({ documentCode: "AKAD-KPR" });

    expect(error).toMatchObject({
      code: "TEMPLATE_NOT_AVAILABLE",
      status: 422,
      message: "Document template AKAD-KPR is not available",
    });
    expect(gotenberg.conversions).toBe(0);
    expect(await generatedRows()).toEqual([]);
  });

  it("refuses with SERVICE_UNAVAILABLE and stores nothing when Gotenberg fails", async () => {
    gotenberg.healthy = false;

    const error = await rejection({});

    expect(error).toMatchObject({ code: "SERVICE_UNAVAILABLE", status: 503 });
    expect(await generatedRows()).toEqual([]);
  });

  it("keeps the seed akad template row pointing at its stored Word file", async () => {
    const { rows } = await db.owner.query(
      `select t.document_code, t.product_id, f.stored_format, f.original_extension from document.document_templates t
       join document.document_files f on f.id = t.file_id where t.id = $1`,
      [seedTemplateIds.akadKtaQa],
    );
    expect(rows).toEqual([
      { document_code: "AKAD-KTAQA", product_id: null, stored_format: "DOCX", original_extension: "docx" },
    ]);
  });
});
