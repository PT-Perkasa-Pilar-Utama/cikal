import type { DecisionMatrixListResponse, DecisionSimulationResponse } from "./decision-matrix.schema.js";

const goRow = {
  id: "0192b6ac-0004-7000-8000-000000000001",
  priority: 4,
  dedupOutcome: "UNMATCH",
  dukcapilOutcome: "PASSED",
  fraudOutcome: "CLEAN",
  racOutcome: "PASS",
  scoringOutcome: "PASS",
  creditBureauOutcome: "COLLECT_1",
} as const;

/** Halaman "Decision Matrix" dengan baris Go AC-69.01 dan baris NotGo AC-36.01. */
export const decisionMatrixListResponseMock = {
  data: [
    { ...goRow, decisionOutcome: "GO", description: null, hasPendingChange: false },
    {
      id: "0192b6ac-0005-7000-8000-000000000001",
      priority: 5,
      dedupOutcome: "ANY",
      dukcapilOutcome: "ANY",
      fraudOutcome: "ANY",
      racOutcome: "ANY",
      scoringOutcome: "PASS",
      creditBureauOutcome: "COLLECT_2",
      decisionOutcome: "NOTGO",
      description: null,
      hasPendingChange: false,
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
} satisfies DecisionMatrixListResponse;

/** Simulasi AC-36.02: hasil Go beserta baris yang dipakai. */
export const decisionSimulationResponseMock = {
  data: { decisionOutcome: "GO", matchedRow: goRow, note: null },
} satisfies DecisionSimulationResponse;
