import { Injectable } from "@nestjs/common";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { documentFiles, documentTemplates } from "./schema.js";

export interface TemplateFile {
  documentCode: string;
  storageKey: string;
}

/** Akses tabel `document.document_templates` (technical-specs 06 §6.8). */
@Injectable()
export class DocumentTemplatesRepository {
  /** Template kode dokumen untuk produk; template khusus produk didahulukan atas template semua produk. */
  async findForProduct(tx: Tx, documentCode: string, productId: string): Promise<TemplateFile | null> {
    const [row] = await tx
      .select({ documentCode: documentTemplates.documentCode, storageKey: documentFiles.storageKey })
      .from(documentTemplates)
      .innerJoin(documentFiles, eq(documentFiles.id, documentTemplates.fileId))
      .where(
        and(
          eq(documentTemplates.documentCode, documentCode),
          or(eq(documentTemplates.productId, productId), isNull(documentTemplates.productId)),
        ),
      )
      .orderBy(sql`${documentTemplates.productId} nulls last`)
      .limit(1);
    return row ?? null;
  }
}
