import type { ApplicationScoringResponse } from "./application-scoring.schema.js";

/** Contoh api-specs 22 §22.6: RAC gagal karena rasio angsuran (AC-67.02) dan Scoring lulus 470 (AC-67.01). */
export const applicationScoringResponseMock = {
  data: {
    rac: {
      modelCode: "KTA-RAC",
      versionNumber: 1,
      result: "FAIL",
      failedReasons: ["Installment to Income Ratio 332% exceeds DBR max 40%"],
      criteria: [
        { displayText: "Installment to Income Ratio <= Product DBR Max", actualValue: "332.1431", isMet: false },
      ],
    },
    scoring: {
      modelCode: "KTA-2026",
      versionNumber: 1,
      constant: "200.00",
      cutOff: "430.00",
      totalScore: "470.00",
      result: "PASS",
      criteria: [
        {
          displayText: "Occupation is one of Karyawan Swasta, Pegawai Negeri Sipil : +100",
          actualValue: "Karyawan Swasta",
          isMet: true,
          appliedWeight: "100.00",
        },
      ],
    },
  },
} satisfies ApplicationScoringResponse;
