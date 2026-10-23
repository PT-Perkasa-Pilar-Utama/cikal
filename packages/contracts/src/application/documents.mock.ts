import type {
  ApplicationDocumentsResponse,
  ApplicationSubmitResponse,
  DocumentUploadResponse,
} from "./documents.schema.js";

const DRAFT_ID = "0192b6f3-0001-7000-8000-000000000001";
const FILE_ID = "0192b6f3-0001-7000-8000-000000000003";
const KTP_FILE = { fileId: FILE_ID, fileName: "ktp.jpg", sizeBytes: 819200, uploadedAt: "2026-10-20T07:05:00.000Z" };

/** Slot step Document dengan KTP terunggah dan BPJS opsional (AC-47.01, AC-47.06). */
export const applicationDocumentsResponseMock = {
  data: {
    slots: [
      { documentType: "KTP", label: "KTP", isMandatory: true, file: KTP_FILE, verificationStatus: "PENDING" },
      { documentType: "BPJS", label: "BPJS", isMandatory: false, file: null, verificationStatus: "PENDING" },
    ],
    completeness: { uploadedMandatory: 1, requiredMandatory: 7 },
  },
} satisfies ApplicationDocumentsResponse;

/** KTP diunggah pada slot pertama (AC-47.01). */
export const documentUploadResponseMock = {
  data: { documentType: "KTP", file: KTP_FILE, completeness: { uploadedMandatory: 1, requiredMandatory: 7 } },
} satisfies DocumentUploadResponse;

/** Pengajuan KTA lengkap dikirim (AC-50.01). */
export const applicationSubmitResponseMock = {
  data: {
    id: DRAFT_ID,
    loanId: "20102026KTA0000013",
    status: "ON_PROGRESS",
    processInstanceId: "0192b6f3-0001-7000-8000-000000000004",
  },
  message: "Application submitted. Loan ID: 20102026KTA0000013",
} satisfies ApplicationSubmitResponse;
