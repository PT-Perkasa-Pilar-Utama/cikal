import { fileTypeFromBuffer } from "file-type";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** Ekstensi unggahan yang diizinkan (DC-02, AC-47.02). */
export const UPLOAD_EXTENSIONS = ["png", "jpg", "jpeg", "pdf", "docx"] as const;
export type UploadExtension = (typeof UPLOAD_EXTENSIONS)[number];

/** Jenis hasil deteksi magic bytes `file-type` yang sah untuk setiap ekstensi. */
const SIGNATURE: Record<UploadExtension, string> = { png: "png", jpg: "jpg", jpeg: "jpg", pdf: "pdf", docx: "docx" };

/** 1 MB = 1.048.576 byte, sehingga 2 MB tepat 2.097.152 byte (AC-47.03). */
export const BYTES_PER_MB = 1024 * 1024;

/** Berkas unggahan; `truncated` berarti pembaca multipart berhenti di batas rute. */
export interface UploadCandidate {
  fileName: string;
  data: Buffer;
  truncated: boolean;
}

const isUploadExtension = (value: string): value is UploadExtension =>
  UPLOAD_EXTENSIONS.some((extension) => extension === value);

function extensionOf(fileName: string): UploadExtension | null {
  const dot = fileName.lastIndexOf(".");
  const extension = dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
  return isUploadExtension(extension) ? extension : null;
}

/**
 * Ekstensi lalu ukuran, sesuai urutan api-specs 12 §12.7 langkah 2 dan 3. Ekstensi harus cocok dengan magic bytes
 * (technical-specs 07 §7.5); batas ukuran dari parameter `UPLOAD_MAX_MB` tenant.
 */
export async function checkUpload(file: UploadCandidate, maxMb: number): Promise<UploadExtension> {
  const extension = extensionOf(file.fileName);
  const detected = await fileTypeFromBuffer(file.data);
  if (!extension || detected?.ext !== SIGNATURE[extension]) throw DomainError.standard("UNSUPPORTED_FILE_TYPE");
  if (file.truncated || file.data.length > maxMb * BYTES_PER_MB) {
    throw DomainError.standard("FILE_TOO_LARGE", `File must not exceed ${maxMb} MB`);
  }
  return extension;
}
