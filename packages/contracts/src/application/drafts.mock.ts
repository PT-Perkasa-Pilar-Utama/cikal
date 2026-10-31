import type { ApplicationDraftListResponse, ApplicationDraftResponse } from "./drafts.schema.js";
import type { ApplicationFormResponse } from "./form.schema.js";
import type { SectionSaveResponse } from "./sections.schema.js";

const DRAFT_ID = "0192b6f3-0001-7000-8000-000000000001";
const PRODUCT_ID = "0192b6f3-0001-7000-8000-000000000002";
const LOAN_ID = "20102026KTA0000013";
const TRM_STP_001_STEPS = ["application", "personal", "occupation", "documents", "emergency-contact"] as const;

const KTP_ADDRESS = {
  address: "Jl. Merdeka No. 10",
  rt: "001",
  rw: "002",
  provinceCode: "32",
  cityCode: "32.73",
  districtCode: "32.73.01",
  subDistrictCode: "32.73.01.1001",
  zipCode: "40111",
};

/** Draft KTA pertama (AC-49.01). */
export const applicationDraftResponseMock = {
  data: {
    id: DRAFT_ID,
    loanId: LOAN_ID,
    status: "DRAFT",
    currentSection: "application",
    steps: [...TRM_STP_001_STEPS],
  },
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
    steps: [...TRM_STP_001_STEPS],
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
        sourceCode: null,
        salesCode: null,
        referralCode: null,
        marketingCode: null,
      },
      personal: {
        idType: "KTP",
        idCardNumber: "3273011402900001",
        fullName: "Rudi Hartono",
        fullNameId: "RUDI HARTONO",
        placeOfBirth: "Bandung",
        dateOfBirth: "1990-02-14",
        gender: "L",
        religion: "ISLAM",
        nationality: "WNI",
        education: "S1",
        marital: "001",
        motherMaidenName: "Siti",
        idIssuedDate: "2020-01-10",
        idExpiredDate: "SEUMUR HIDUP",
        npwpNumber: null,
        kkNumber: null,
        mobileNumber: "081298765432",
        phoneNumber: null,
        email: null,
        addresses: { id: KTP_ADDRESS, residence: { ...KTP_ADDRESS, sameAsId: true } },
        consentAt: "2026-10-20T07:00:00.000Z",
      },
      spouse: null,
      occupation: null,
      business: null,
      collateral: null,
      "emergency-contact": null,
    },
    documentCompleteness: null,
    collateralTypes: [],
    returnNote: null,
  },
} satisfies ApplicationFormResponse;

/** Section Personal disimpan dengan "Next" (AC-40.01). */
export const sectionSaveResponseMock = {
  data: {
    id: DRAFT_ID,
    loanId: LOAN_ID,
    status: "DRAFT",
    savedSection: "personal",
    nextSection: "occupation",
    steps: [...TRM_STP_001_STEPS],
  },
} satisfies SectionSaveResponse;
