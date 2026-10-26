import { VERIFICATION_MESSAGES, type VerificationDocumentInput } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

export type DocumentStatus = "PENDING" | "MATCH" | "NOT_MATCH";

/** Satu dokumen terunggah dan status verifikasinya. */
export interface DocumentState {
  documentType: string;
  label: string;
  verificationStatus: DocumentStatus;
  remarks: string | null;
}

export interface Submission {
  result: "ALL_MATCH" | "HAS_NOT_MATCH";
  /** Daftar dokumen Not Match dan remarks-nya untuk Sales (AC-64.02). */
  returnNote: string | null;
}

/** Pesan usulan engineering untuk dokumen yang tidak diunggah di pengajuan. */
export const notUploadedMessage = (documentType: string) => `Document ${documentType} is not uploaded`;

/**
 * Status masukan digabung dengan status tersimpan (api-specs 15 §15.2): dokumen yang tidak dikirim tetap, remarks
 * yang tidak dikirim tetap. Dokumen yang tidak diunggah `400 VALIDATION_FAILED`.
 */
export function merged(saved: readonly DocumentState[], inputs: readonly VerificationDocumentInput[]): DocumentState[] {
  const known = new Set(saved.map((document) => document.documentType));
  const unknown = inputs.filter((input) => !known.has(input.documentType));
  if (unknown.length > 0) {
    throw DomainError.standard(
      "VALIDATION_FAILED",
      undefined,
      unknown.map((input) => ({
        field: `documents.${input.documentType}`,
        code: "VALIDATION_FAILED",
        message: notUploadedMessage(input.documentType),
      })),
    );
  }
  return saved.map((document) => {
    const input = inputs.find((candidate) => candidate.documentType === document.documentType);
    if (!input) return document;
    const remarks = input.remarks === undefined ? document.remarks : input.remarks || null;
    return { ...document, verificationStatus: input.verificationStatus, remarks };
  });
}

/**
 * Hasil submit api-specs 15 §15.3: dokumen masih PENDING `422 VERIFICATION_INCOMPLETE`, Not Match tanpa remarks
 * `422 REMARKS_REQUIRED` per dokumen (AC-64.03), semua Match `ALL_MATCH` (AC-64.01), selain itu `HAS_NOT_MATCH`
 * dengan catatan per dokumen (AC-64.02).
 */
export function submission(documents: readonly DocumentState[]): Submission {
  if (documents.length === 0 || documents.some((document) => document.verificationStatus === "PENDING")) {
    throw new DomainError("VERIFICATION_INCOMPLETE", VERIFICATION_MESSAGES.incomplete, 422);
  }
  const notMatch = documents.filter((document) => document.verificationStatus === "NOT_MATCH");
  const withoutRemarks = notMatch.filter((document) => !document.remarks);
  if (withoutRemarks.length > 0) {
    const message = VERIFICATION_MESSAGES.remarksRequired;
    throw new DomainError(
      "REMARKS_REQUIRED",
      message,
      422,
      withoutRemarks.map((document) => ({
        field: `documents.${document.documentType}.remarks`,
        code: "REMARKS_REQUIRED",
        message,
      })),
    );
  }
  if (notMatch.length === 0) return { result: "ALL_MATCH", returnNote: null };
  return {
    result: "HAS_NOT_MATCH",
    returnNote: notMatch.map((document) => `${document.label}: ${document.remarks}`).join("\n"),
  };
}
