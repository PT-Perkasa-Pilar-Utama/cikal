import type {
  ApplicationVerificationResponse,
  VerificationSaveResponse,
  VerificationSubmitResponse,
} from "./verification.schema.js";

/** Verifikator pemilik tugas dengan KTP sudah Match dan NPWP belum diperiksa (AC-64.04). */
export const applicationVerificationResponseMock = {
  data: {
    applicationId: "0192b6d0-0001-7000-8000-000000000001",
    loanId: "20102026KTA0000013",
    taskId: "0192b6d1-0001-7000-8000-000000000001",
    editable: true,
    documents: [
      {
        documentType: "KTP",
        label: "KTP",
        isMandatory: true,
        fileId: "0192b6d2-0001-7000-8000-000000000001",
        verificationStatus: "MATCH",
        remarks: null,
      },
      {
        documentType: "NPWP",
        label: "NPWP",
        isMandatory: true,
        fileId: "0192b6d2-0002-7000-8000-000000000001",
        verificationStatus: "PENDING",
        remarks: null,
      },
    ],
    applicantSummary: { fullName: "Rudi Hartono", idCardNumber: "3273011402900001", dateOfBirth: "1990-02-14" },
  },
} satisfies ApplicationVerificationResponse;

/** "Save" 4 dari 7 dokumen (AC-64.04). */
export const verificationSaveResponseMock = {
  data: { savedCount: 4, pendingCount: 3 },
  message: "Verification saved",
} satisfies VerificationSaveResponse;

/** NPWP Not Match mengembalikan pengajuan ke Draft (AC-64.02). */
export const verificationSubmitResponseMock = {
  data: { result: "HAS_NOT_MATCH", nextStep: null, applicationStatus: "DRAFT" },
  message: "Verification submitted",
} satisfies VerificationSubmitResponse;
