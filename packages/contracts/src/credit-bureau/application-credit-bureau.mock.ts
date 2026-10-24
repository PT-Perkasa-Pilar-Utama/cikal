import type { ApplicationCreditBureauResponse } from "./application-credit-bureau.schema.js";

/** Contoh api-specs 23 §23.3: satu fasilitas aktif dengan kolektibilitas 1 (AC-68.01). */
export const applicationCreditBureauResponseMock = {
  data: {
    mode: "SYNC",
    providerCode: "SIMULATION_M10",
    reportReference: "SIM-SLIK-0001",
    reportDate: "2026-10-20",
    hasHistory: true,
    aggregatedCollectibility: 1,
    quality: "Good",
    outcome: "COLLECT_1",
    label: "Collectibility 1 - Good",
    reportFileId: null,
    facilities: [
      {
        lenderName: "Bank Lain",
        facilityType: "KTA",
        plafond: "50000000.00",
        outstanding: "12000000.00",
        collectibility: 1,
        daysPastDue: 0,
        condition: "ACTIVE",
        lastUpdated: "2026-09-30",
      },
    ],
  },
} satisfies ApplicationCreditBureauResponse;
