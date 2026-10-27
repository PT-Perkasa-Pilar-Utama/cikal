import type { VerificationDocument, VerificationSaveRequest } from "@cikal/contracts";

export interface DocumentValue {
  verificationStatus: VerificationDocument["verificationStatus"];
  remarks: string;
}

export type VerificationValues = Record<string, DocumentValue>;

/** Isi awal form dari status dan remarks tersimpan (AC-64.04). */
export function initialValues(documents: readonly VerificationDocument[]): VerificationValues {
  return Object.fromEntries(
    documents.map((document) => [
      document.documentType,
      { verificationStatus: document.verificationStatus, remarks: document.remarks ?? "" },
    ]),
  );
}

/** Body Save dan Submit: semua dokumen; remarks hanya untuk Not Match, selain itu dihapus (api-specs 15 §15.2). */
export function verificationRequest(values: VerificationValues): VerificationSaveRequest {
  return {
    documents: Object.entries(values).map(([documentType, { verificationStatus, remarks }]) => ({
      documentType,
      verificationStatus,
      remarks: verificationStatus === "NOT_MATCH" && remarks.trim() ? remarks.trim() : null,
    })),
  };
}
