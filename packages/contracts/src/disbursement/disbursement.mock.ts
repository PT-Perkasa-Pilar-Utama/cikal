import type { DisbursementDetailResponse, ValidityCheckResponse } from "./disbursement.schema.js";

/** Pengajuan KPR yang menunggu Validity Check (api-specs 25 §25.1). */
export const disbursementDetailResponseMock = {
  data: {
    applicationId: "0192b6e0-0001-7000-8000-000000000041",
    loanId: "20102026KPR0000041",
    currentStep: "VALIDITY_CHECK",
    disbursementAmount: "580000000.00",
    bankAccountNumber: null,
    disbursementDate: null,
    firstInstallmentDate: "2026-11-21",
    validityStatus: null,
    notValidReason: null,
    contractNumber: null,
    contractDate: null,
    akadPrints: [],
    coreResponse: null,
  },
} satisfies DisbursementDetailResponse;

/** Valid dengan tanggal pencairan besok dan First Installment Date diubah ke tanggal 25 (AC-76.01, AC-76.05). */
export const validityCheckValidResponseMock = {
  data: {
    validityStatus: "VALID",
    disbursementDate: "2026-10-21",
    firstInstallmentDate: "2026-11-25",
    nextStep: "PRINT_AKAD",
  },
  message: "Disbursement data validated",
} satisfies ValidityCheckResponse;

export const validityCheckNotValidResponseMock = {
  data: { validityStatus: "NOT_VALID", applicationStatus: "DRAFT" },
  message: "Disbursement data marked as not valid",
} satisfies ValidityCheckResponse;
