import { Injectable } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { UploadExtension } from "../domain/upload-rules.js";
import { documentFiles } from "./schema.js";

export interface DocumentFileRow {
  id: string;
  fileName: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}

export interface NewDocumentFile {
  id: string;
  tenantId: string;
  fileName: string;
  originalExtension: UploadExtension;
  sizeBytes: number;
  storageKey: string;
  userId: string;
}

/** Akses tabel `document.document_files` (technical-specs 06 §6.8). */
@Injectable()
export class DocumentFilesRepository {
  async insert(tx: Tx, file: NewDocumentFile): Promise<DocumentFileRow> {
    const [row] = await tx
      .insert(documentFiles)
      .values({
        id: file.id,
        tenantId: file.tenantId,
        fileName: file.fileName,
        originalExtension: file.originalExtension,
        storedFormat: "PDF",
        sizeBytes: file.sizeBytes,
        storageKey: file.storageKey,
        createdBy: file.userId,
        updatedBy: file.userId,
      })
      .returning();
    if (!row) throw new Error(`Document file ${file.id} was not inserted`);
    return row;
  }

  /** File di tenant transaksi; file tenant lain tidak terlihat karena RLS. */
  async find(tx: Tx, id: string): Promise<DocumentFileRow | null> {
    const [row] = await tx.select().from(documentFiles).where(eq(documentFiles.id, id));
    return row ?? null;
  }

  async findMany(tx: Tx, ids: readonly string[]): Promise<DocumentFileRow[]> {
    if (ids.length === 0) return [];
    return tx
      .select()
      .from(documentFiles)
      .where(inArray(documentFiles.id, [...ids]));
  }
}
