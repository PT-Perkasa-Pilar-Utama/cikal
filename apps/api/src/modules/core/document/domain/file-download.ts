import type { FileDownloadQuery } from "@cikal/contracts";

/** Umur URL bertanda tangan (technical-specs 07 §7.7). */
export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/** Semua file disimpan sebagai PDF (DC-02). */
export const STORED_CONTENT_TYPE = "application/pdf";

/** Nama unduhan mengikuti isi PDF: "ktp.jpg" menjadi "ktp.pdf" (api-specs 10 §10.1). */
export function pdfFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return `${dot > 0 ? fileName.slice(0, dot) : fileName}.pdf`;
}

/** Header `Content-Disposition` RFC 6266: `filename` ASCII sebagai cadangan dan `filename*` UTF-8. */
export function contentDisposition(disposition: FileDownloadQuery["disposition"], fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
