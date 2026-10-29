import { DomainError } from "../../../../platform/http/domain-error.js";

/** Langkah pencairan sudah tidak menunggu tugas user (api-specs 25 §25.2, §25.3). */
export const ALREADY_PROCESSED_MESSAGE = "This application has already been processed";

/** Pengajuan tidak ada di tenant sesi (api-specs 25 §25.1). */
export function applicationNotFound(): DomainError {
  return new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
}

/** Pilihan form Print Akad yang tidak ada di tenant (api-specs 25 §25.3, teks usulan engineering). */
export function unavailableChoice(field: string, label: string): DomainError {
  return DomainError.standard("VALIDATION_FAILED", undefined, [
    { field, code: "VALIDATION_FAILED", message: `${label} is not available` },
  ]);
}

/** Skema kontrak sudah mewajibkan field per hasil; ini hanya penyempit tipe. */
export function required(value: string | undefined): string {
  if (!value) throw DomainError.standard("VALIDATION_FAILED");
  return value;
}
