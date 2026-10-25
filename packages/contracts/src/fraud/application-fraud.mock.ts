import type { ApplicationFraudResponse } from "./application-fraud.schema.js";

/** Contoh api-specs 21 §21.2: pengajuan Upload Excel tanpa IP, bersih dari blacklist dan frekuensi (AC-65.02). */
export const applicationFraudResponseMock = {
  data: {
    outcome: "CLEAN",
    isBlacklisted: false,
    ipCheck: { status: "NOT_APPLICABLE", ipAddress: null, category: null, providerCode: null },
    velocityHits: [
      { dimension: "FULL_NAME", windowValue: 1, windowUnit: "DAY", maxCount: 3, actualCount: 1, exceeded: false },
    ],
    matrixRow: { id: "0192b6c7-0004-7000-8000-000000000001", priority: 4, nameCondition: "NORMAL", ipCondition: "ANY" },
    review: null,
  },
} satisfies ApplicationFraudResponse;
