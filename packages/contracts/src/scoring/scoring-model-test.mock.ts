import type { ScoringModelTestResponse } from "./scoring-model-test.schema.js";

/** Model KTA-2026 dengan Constant 200 dan Cut Off 430 diuji dengan pengajuan contoh (AC-38.01). */
export const scoringModelTestResponseMock = {
  data: {
    sampleLoanId: "15122025KTA0000013",
    modelGroup: "SCORING",
    constant: "200.00",
    cutOff: "430.00",
    totalScore: "470.00",
    result: "PASS",
    criteria: [
      {
        criterionId: "0192b6c4-0001-7000-8000-000000000001",
        displayText: "Occupation is one of ASN, Karyawan BUMN : +50",
        actualValue: "ASN",
        isMet: true,
        appliedWeight: "50.00",
      },
    ],
  },
} satisfies ScoringModelTestResponse;
