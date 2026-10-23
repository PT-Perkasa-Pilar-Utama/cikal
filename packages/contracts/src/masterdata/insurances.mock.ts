import type { InsuranceListResponse } from "./insurances.schema.js";

/** Asuransi contoh step Application (AC-39.01). */
export const insuranceListResponseMock = {
  data: [
    {
      id: "0192b6a9-0001-7000-8000-000000000001",
      insuranceCode: "ASR01",
      insuranceName: "Asuransi Contoh",
      isActive: true,
    },
  ],
} satisfies InsuranceListResponse;
