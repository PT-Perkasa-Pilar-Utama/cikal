import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SeedContext } from "../../../../platform/migrate/module-data.js";
import { seedCompanyIds } from "../../tenancy/index.js";
import { documentFiles, documentTemplates } from "../db/schema.js";
import { akadDocumentCode, detectPlaceholders } from "../domain/document-template.js";
import { akadTemplateDocx } from "./akad-template.js";

const DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** ID tetap template akad seed `qa`. */
export const seedTemplateIds = {
  akadKtaQaFile: "0192b6cb-0001-7000-8000-000000000001",
  akadKtaQa: "0192b6cb-0002-7000-8000-000000000001",
} as const;

/**
 * Template akad produk seed KTAQA untuk semua produk company 001 (grooming v2 POC: template akad dari seed). Objek
 * storage ditulis setiap seed; reset mengosongkan bucket sebelum seed sehingga template tetap ada.
 */
export async function seedQaTemplates(db: NodePgDatabase, ctx: SeedContext): Promise<void> {
  const tenantId = seedCompanyIds.company001;
  const docx = akadTemplateDocx();
  const storageKey = `tenants/${tenantId}/document/${seedTemplateIds.akadKtaQaFile}`;
  await ctx.putObject({ key: storageKey, body: docx, contentType: DOCX_CONTENT_TYPE });
  await db
    .insert(documentFiles)
    .values({
      id: seedTemplateIds.akadKtaQaFile,
      tenantId,
      fileName: "Surat Perjanjian Kredit KTAQA.docx",
      originalExtension: "docx",
      storedFormat: "DOCX",
      sizeBytes: docx.length,
      storageKey,
    })
    .onConflictDoNothing();
  await db
    .insert(documentTemplates)
    .values({
      id: seedTemplateIds.akadKtaQa,
      tenantId,
      documentCode: akadDocumentCode("KTAQA"),
      productId: null,
      fileId: seedTemplateIds.akadKtaQaFile,
      placeholders: detectPlaceholders(docx),
    })
    .onConflictDoNothing();
}
