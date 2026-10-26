import type {
  CriterionResponse,
  ScoringCriterion,
  ScoringModelDetailResponse,
  ScoringModelListResponse,
} from "./scoring-models.schema.js";

const ktaScoring = {
  id: "0192b6c5-0002-7000-8000-000000000001",
  modelCode: "KTA-2026",
  modelName: "Scoring KTA 2026",
  modelGroup: "SCORING",
  versionNumber: 2,
  status: "DRAFT",
  constant: "200.00",
  cutOff: "430.00",
  reviewLowerBound: null,
} as const;

const occupationCriterion = {
  id: "0192b6c6-0101-7000-8000-000000000001",
  fieldCode: "OCCUPATION",
  operator: "IN",
  value: { type: "LITERAL", values: ["003", "004"] },
  weight: "50.00",
  criterionType: "WEIGHTED",
  displayText: "Occupation is one of ASN, Karyawan BUMN : +50",
} satisfies ScoringCriterion;

/** Halaman "Scoring Model": draft versi 2 KTA-2026 (AC-37.05). */
export const scoringModelListResponseMock = {
  data: [
    {
      ...ktaScoring,
      products: [{ id: "0192b6ca-0001-7000-8000-000000000001", productCode: "KTAQA" }],
      criteriaCount: 1,
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies ScoringModelListResponse;

/** Detail draft dengan kriteria AC-37.01. */
export const scoringModelDetailResponseMock = {
  data: {
    ...ktaScoring,
    effectiveFrom: null,
    productIds: ["0192b6ca-0001-7000-8000-000000000001"],
    criteria: [occupationCriterion],
  },
} satisfies ScoringModelDetailResponse;

/** Kriteria tersimpan dengan teks server (AC-37.01). */
export const criterionResponseMock = { data: occupationCriterion } satisfies CriterionResponse;
