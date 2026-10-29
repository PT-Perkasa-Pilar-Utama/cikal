import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { TenantContext, Tx } from "../../../../platform/db/tenant-tx.js";
import { GeneratedDocumentsRepository } from "../db/generated-documents.repository.js";
import type { StoredFile } from "./document-files.js";

/** Dokumen hasil generate satu pengajuan, contoh akad dengan nomor kontraknya (DN-06, api-specs 25 §25.3). */
export interface GeneratedDocumentRecord {
  applicationId: string;
  documentCode: string;
  documentNumber: string | null;
  file: StoredFile;
  isReprint: boolean;
}

/**
 * GeneratedDocument modul Document (technical-specs 05 §5.9): pemanggil `generate` mencatat file hasilnya dan nomor
 * dokumennya di transaksinya sendiri.
 */
@Injectable()
export class GeneratedDocuments {
  constructor(private readonly documents: GeneratedDocumentsRepository) {}

  async record(tx: Tx, actor: TenantContext, document: GeneratedDocumentRecord): Promise<string> {
    const id = uuidv7();
    await this.documents.insert(
      tx,
      {
        id,
        tenantId: actor.tenantId,
        applicationId: document.applicationId,
        documentCode: document.documentCode,
        documentNumber: document.documentNumber,
        fileId: document.file.fileId,
        isReprint: document.isReprint,
      },
      actor.userId,
    );
    return id;
  }

  /** Pengajuan pemilik file hasil generate, untuk aturan lihat file modul pemanggil (api-specs 10 §10.1). */
  async applicationOfFile(tx: Tx, fileId: string): Promise<string | null> {
    return (await this.documents.findFileOwner(tx, fileId))?.applicationId ?? null;
  }
}
