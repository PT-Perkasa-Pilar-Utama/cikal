import type { ApplicationDedupResponse } from "./application-dedup.schema.js";

/** Contoh api-specs 19 §19.2: nama dan nama ibu mirip dengan pengajuan yang sudah cair (TRM_DDP_002). */
export const applicationDedupResponseMock = {
  data: {
    outcome: "REVIEW",
    ranAt: "2026-10-20T07:30:02Z",
    matchedApplication: { id: "0192b6b0-0004-7000-8000-000000000001", loanId: "15092026KTA0000004" },
    matrixRow: {
      id: "0192b6c0-0002-7000-8000-000000000001",
      priority: 2,
      nik: "MATCH",
      fullNameId: "FUZZY",
      dob: "MATCH",
      pob: "MATCH",
      motherMaidenName: "FUZZY",
    },
    candidates: [
      {
        loanId: "15092026KTA0000004",
        status: "DISBURSED",
        nikResult: "MATCH",
        dobResult: "MATCH",
        pobResult: "MATCH",
        nameScore: "0.8800",
        motherNameScore: "0.8200",
      },
    ],
    review: null,
  },
} satisfies ApplicationDedupResponse;
