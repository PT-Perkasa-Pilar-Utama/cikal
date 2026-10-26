import type { FinancingResponse } from "./financing.schema.js";

/** Auto approval KTA 3 bulan, bunga efektif 13% (AC-74.01); sisa pokok baris terakhir 0. */
export const financingResponseMock = {
  data: {
    loanAmount: "3000000.00",
    tenor: 3,
    interestType: "EFFECTIVE",
    interestRate: "13.0000",
    monthlyInstallment: "1021723.00",
    adminFee: "250000.00",
    provisionFee: "30000.00",
    insuranceValue: "0.00",
    netDisbursement: "2720000.00",
    dbrRatio: "12.7715",
    dsrRatio: null,
    firstInstallmentDate: "2026-11-26",
    approvalType: "AUTO",
    sp3kNumber: null,
    schedule: [
      {
        installmentNo: 1,
        dueDate: "2026-11-26",
        principalAmount: "989223.00",
        interestAmount: "32500.00",
        outstandingAmount: "2010777.00",
      },
      {
        installmentNo: 2,
        dueDate: "2026-12-26",
        principalAmount: "999940.00",
        interestAmount: "21783.00",
        outstandingAmount: "1010837.00",
      },
      {
        installmentNo: 3,
        dueDate: "2027-01-26",
        principalAmount: "1010837.00",
        interestAmount: "10951.00",
        outstandingAmount: "0.00",
      },
    ],
  },
} satisfies FinancingResponse;
