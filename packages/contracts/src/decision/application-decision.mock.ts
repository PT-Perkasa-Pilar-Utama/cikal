import type { ApplicationDecisionResponse } from "./application-decision.schema.js";

/** Langkah "Decision" pengajuan Go (AC-69.01). */
export const applicationDecisionResponseMock = {
  data: {
    decisionOutcome: "GO",
    outcomes: {
      dedup: "UNMATCH",
      dukcapil: "PASSED",
      fraud: "CLEAN",
      rac: "PASS",
      scoring: "PASS",
      creditBureau: "COLLECT_1",
    },
    matchedRow: { id: "0192b6ac-0004-7000-8000-000000000001", priority: 4 },
    description: null,
    nextStep: "APPROVAL",
  },
} satisfies ApplicationDecisionResponse;
