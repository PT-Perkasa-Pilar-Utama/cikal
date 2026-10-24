import type { ApplicationDukcapilResponse } from "./application-dukcapil.schema.js";

/** Contoh api-specs 20 §20.2: skor akhir 0,88 di antara ambang Review dan Passed (TRM_DKC_003). */
export const applicationDukcapilResponseMock = {
  data: {
    outcome: "REVIEW",
    recordFound: true,
    providerCode: "SIMULATION_M07",
    providerReference: "SIM-3171990000000103",
    dobStatus: "MATCH",
    pobStatus: "MATCH",
    fullNameScore: "0.9000",
    motherNameScore: "0.8500",
    finalScore: "0.8800",
    rule: { nameWeight: "60.0000", motherNameWeight: "40.0000", passedThreshold: "0.9000", reviewThreshold: "0.7500" },
    reviews: [],
  },
} satisfies ApplicationDukcapilResponse;
