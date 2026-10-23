import { DomainError } from "../../../../platform/http/domain-error.js";
import type { UploadExtension } from "../domain/upload-rules.js";
import type { PdfConverterPort } from "../ports/pdf-converter.port.js";

/** Batas satu konversi; LibreOffice di Gotenberg butuh beberapa detik untuk dokumen besar. */
const CONVERT_TIMEOUT_MS = 30_000;

/**
 * Adapter Gotenberg `POST /forms/libreoffice/convert` (technical-specs 05 §5.9). Gotenberg menjawab `400` bila
 * LibreOffice tidak bisa membaca isi berkas yang magic bytes-nya cocok, contoh gambar rusak: berkas itu ditolak
 * `415 UNSUPPORTED_FILE_TYPE`. Tanpa `GOTENBERG_URL`, atau bila Gotenberg tidak tersedia, unggahan dijawab
 * `503 SERVICE_UNAVAILABLE` (api-specs 12 §12.7).
 */
export class GotenbergPdfConverter implements PdfConverterPort {
  constructor(private readonly baseUrl: string | null) {}

  /** Gotenberg memilih pembaca LibreOffice dari ekstensi nama berkas; nama asli user tidak dikirim. */
  async toPdf(extension: Exclude<UploadExtension, "pdf">, data: Buffer): Promise<Buffer> {
    if (!this.baseUrl) throw DomainError.standard("SERVICE_UNAVAILABLE");
    const form = new FormData();
    form.append("files", new Blob([data]), `upload.${extension}`);
    const response = await fetch(new URL("/forms/libreoffice/convert", this.baseUrl), {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(CONVERT_TIMEOUT_MS),
    }).catch(() => null);
    if (response?.status === 400) throw DomainError.standard("UNSUPPORTED_FILE_TYPE");
    if (!response?.ok) throw DomainError.standard("SERVICE_UNAVAILABLE");
    return Buffer.from(await response.arrayBuffer());
  }
}
