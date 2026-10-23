import type { UploadExtension } from "../domain/upload-rules.js";

/** Seam konversi ke PDF (technical-specs 05 §5.9): Gotenberg, atau server tiruan di uji. */
export interface PdfConverterPort {
  /**
   * Isi PDF dari berkas png, jpg, jpeg, atau docx. Isi yang tidak terbaca gagal `415 UNSUPPORTED_FILE_TYPE`;
   * konverter tidak tersedia gagal `503 SERVICE_UNAVAILABLE`.
   */
  toPdf(extension: Exclude<UploadExtension, "pdf">, data: Buffer): Promise<Buffer>;
}

export const PDF_CONVERTER_PORT = Symbol("PDF_CONVERTER_PORT");
