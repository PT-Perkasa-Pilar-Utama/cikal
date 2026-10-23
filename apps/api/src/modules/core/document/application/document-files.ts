import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { TenantContext, Tx } from "../../../../platform/db/tenant-tx.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { StorageService } from "../../../../platform/storage/storage.module.js";
import { DocumentFilesRepository } from "../db/document-files.repository.js";
import { STORED_CONTENT_TYPE } from "../domain/file-download.js";
import { checkUpload, type UploadCandidate } from "../domain/upload-rules.js";
import { PDF_CONVERTER_PORT, type PdfConverterPort } from "../ports/pdf-converter.port.js";

/** File tersimpan seperti ditampilkan slot dokumen (api-specs 12 §12.7). */
export interface StoredFile {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: Date;
}

/**
 * `upload(file, ctx)` modul Document (technical-specs 05 §5.9) untuk modul pemilik file. Berjalan di transaksi
 * pemanggil agar baris file dan rujukannya commit bersama. Konversi dan unggah ke storage terjadi sebelum insert,
 * jadi transaksi yang batal setelahnya meninggalkan objek tanpa baris.
 */
@Injectable()
export class DocumentFiles {
  constructor(
    private readonly files: DocumentFilesRepository,
    private readonly storage: StorageService,
    @Inject(PDF_CONVERTER_PORT) private readonly converter: PdfConverterPort,
    @Inject(SYSTEM_PARAMETER_PORT) private readonly parameters: SystemParameterPort,
  ) {}

  async upload(tx: Tx, actor: TenantContext, file: UploadCandidate): Promise<StoredFile> {
    const extension = await checkUpload(file, await this.uploadMaxMb(tx));
    const pdf = extension === "pdf" ? file.data : await this.converter.toPdf(extension, file.data);
    const id = uuidv7();
    const storageKey = `tenants/${actor.tenantId}/document/${id}`;
    await this.storage.putObject(storageKey, pdf, STORED_CONTENT_TYPE);
    const row = await this.files.insert(tx, {
      id,
      tenantId: actor.tenantId,
      fileName: file.fileName,
      originalExtension: extension,
      sizeBytes: file.data.length,
      storageKey,
      userId: actor.userId,
    });
    return { fileId: row.id, fileName: row.fileName, sizeBytes: row.sizeBytes, uploadedAt: row.createdAt };
  }

  /** Data file untuk slot dokumen pemiliknya; id yang tidak ada di tenant transaksi dilewati. */
  async describe(tx: Tx, ids: readonly string[]): Promise<StoredFile[]> {
    const rows = await this.files.findMany(tx, ids);
    return rows.map((row) => ({
      fileId: row.id,
      fileName: row.fileName,
      sizeBytes: row.sizeBytes,
      uploadedAt: row.createdAt,
    }));
  }

  private async uploadMaxMb(tx: Tx): Promise<number> {
    const value = Number(await this.parameters.value(tx, "UPLOAD_MAX_MB"));
    if (!Number.isInteger(value) || value < 1) throw new Error(`UPLOAD_MAX_MB has an invalid value: ${value}`);
    return value;
  }
}
