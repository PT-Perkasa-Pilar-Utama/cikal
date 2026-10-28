import { Inject, Injectable } from "@nestjs/common";
import type { TenantContext, Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { StorageService } from "../../../../platform/storage/storage.module.js";
import { DocumentTemplatesRepository } from "../db/document-templates.repository.js";
import { fillTemplate, type TemplateData } from "../domain/document-template.js";
import { PDF_CONVERTER_PORT, type PdfConverterPort } from "../ports/pdf-converter.port.js";
import { DocumentFiles, type StoredFile } from "./document-files.js";

/** Permintaan generate satu dokumen dari template, contoh akad `AKAD-KPR` (api-specs 25 §25.3). */
export interface GenerateDocument {
  documentCode: string;
  productId: string;
  /** Nama unduhan PDF, contoh "Surat Perjanjian Kredit 20102026KPR0000041.pdf". */
  fileName: string;
  data: TemplateData;
}

/**
 * `generate(documentCode, ...)` modul Document (technical-specs 05 §5.9): isi template Word (docxtemplater), konversi
 * ke PDF lewat Gotenberg, simpan sebagai file. Pemanggil menyimpan GeneratedDocument dan nomornya (BE-S6-02).
 */
@Injectable()
export class DocumentGenerator {
  constructor(
    private readonly templates: DocumentTemplatesRepository,
    private readonly files: DocumentFiles,
    private readonly storage: StorageService,
    @Inject(PDF_CONVERTER_PORT) private readonly converter: PdfConverterPort,
  ) {}

  /** Template tidak ada: `422 TEMPLATE_NOT_AVAILABLE` (AC-77.03); konverter tidak tersedia: `503 SERVICE_UNAVAILABLE`. */
  async generate(tx: Tx, actor: TenantContext, request: GenerateDocument): Promise<StoredFile> {
    const template = await this.templates.findForProduct(tx, request.documentCode, request.productId);
    if (!template) {
      throw new DomainError(
        "TEMPLATE_NOT_AVAILABLE",
        `Document template ${request.documentCode} is not available`,
        422,
      );
    }
    const docx = fillTemplate(await this.storage.getObject(template.storageKey), request.data);
    const pdf = await this.converter.toPdf("docx", docx);
    return this.files.storePdf(tx, actor, {
      fileName: request.fileName,
      originalExtension: "docx",
      sizeBytes: docx.length,
      pdf,
    });
  }
}
