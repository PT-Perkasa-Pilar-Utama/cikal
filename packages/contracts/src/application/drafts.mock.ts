import type {
  ApplicationDraftListResponse,
  ApplicationDraftResponse,
  ApplicationFormResponse,
} from "./drafts.schema.js";

const DRAFT_ID = "0192b6f3-0001-7000-8000-000000000001";
const PRODUCT_ID = "0192b6f3-0001-7000-8000-000000000002";
const LOAN_ID = "20102026KTA0000013";
const POC_STEPS = ["application", "personal", "occupation", "documents", "emergency-contact"] as const;

/** Draft KTA pertama (AC-49.01). */
export const applicationDraftResponseMock = {
  data: { id: DRAFT_ID, loanId: LOAN_ID, status: "DRAFT", currentSection: "application", steps: [...POC_STEPS] },
  message: `Application saved as draft. Loan ID: ${LOAN_ID}`,
} satisfies ApplicationDraftResponse;

/** Draft milik Sales yang tersimpan sampai step Occupation (AC-49.05). */
export const applicationDraftListResponseMock = {
  data: [
    {
      id: DRAFT_ID,
      loanId: LOAN_ID,
      fullName: "Rudi Hartono",
      productCode: "KTA",
      requestedLimit: "20000000.00",
      currentSection: "occupation",
      returnNote: null,
      updatedAt: "2026-10-20T07:00:00.000Z",
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies ApplicationDraftListResponse;

/** Form draft yang dilanjutkan dari step Occupation (AC-49.05). */
export const applicationFormResponseMock = {
  data: {
    id: DRAFT_ID,
    loanId: LOAN_ID,
    status: "DRAFT",
    currentSection: "occupation",
    steps: [...POC_STEPS],
    sections: {
      application: {
        applicationType: "NTB",
        productCategory: "NON_COLLATERAL",
        productId: PRODUCT_ID,
        segment: null,
        purposeOfLoan: null,
        tenorProposed: 36,
        requestedLimit: "20000000.00",
        insuranceId: null,
      },
      personal: {
        idType: "KTP",
        idCardNumber: "3273011402900001",
        fullName: "Rudi Hartono",
        fullNameId: "RUDI HARTONO",
      },
      occupation: null,
      "emergency-contact": null,
    },
    documentCompleteness: null,
    returnNote: null,
  },
} satisfies ApplicationFormResponse;
