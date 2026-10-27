import type { ApplicationDetailResponse } from "./detail.schema.js";
import { applicationFormResponseMock } from "./drafts.mock.js";
import type { ApplicationInquiryResponse } from "./inquiry.schema.js";

const APPLICATION_ID = "0192b6f3-0001-7000-8000-000000000001";
const LOAN_ID = "20102026KTA0000013";

/** Pengajuan KTA di langkah Approval pada daftar "Application Inquiry" (api-specs 17 §17.1). */
export const applicationInquiryResponseMock = {
  data: [
    {
      id: APPLICATION_ID,
      loanId: LOAN_ID,
      fullName: "Rudi Hartono",
      idCardNumberMasked: "3273********0001",
      productCode: "KTA",
      branchCode: "011",
      requestedLimit: "20000000.00",
      status: "ON_PROGRESS",
      state: "APPROVAL",
      submittedAt: "2026-10-20T07:30:00.000Z",
      modifiedAt: "2026-10-21T03:00:00.000Z",
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies ApplicationInquiryResponse;

/** Detail KTA pemohon belum kawin dan karyawan yang menunggu Approval (AC-84.01, AC-84.03). */
export const applicationDetailResponseMock = {
  data: {
    id: APPLICATION_ID,
    loanId: LOAN_ID,
    status: "ON_PROGRESS",
    currentStep: "APPROVAL",
    currentStepStatus: "WAITING_HUMAN",
    summary: {
      applicationType: "NTB",
      loanAmount: "20000000.00",
      tenorApproved: null,
      productCode: "KTA",
      branchCode: "011",
      submittedAt: "2026-10-20T07:30:00.000Z",
    },
    tabs: ["detail", "personal", "occupation", "documents", "emergency-contact", "workflow", "dedup", "approval"],
    sections: applicationFormResponseMock.data.sections,
    processInstances: [{ id: "0192b6f3-0001-7000-8000-000000000009", recontestNumber: 0, status: "WAITING" }],
  },
} satisfies ApplicationDetailResponse;
