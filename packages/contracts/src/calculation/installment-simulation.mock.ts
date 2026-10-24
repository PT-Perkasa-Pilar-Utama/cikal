import type { InstallmentSimulationResponse } from "./installment-simulation.schema.js";

/** Simulasi Effective Rp100.000.000, 12 bulan, 12% (AC-51.01); baris tengah dihilangkan. */
export const installmentSimulationResponseMock = {
  data: {
    interestType: "EFFECTIVE",
    principal: "100000000.00",
    tenor: 12,
    appliedRate: "12.0000",
    monthlyInstallment: "8884879.00",
    totalInterest: "6618545.00",
    totalPayment: "106618545.00",
    schedule: [
      {
        installmentNo: 1,
        dueDate: "2026-11-24",
        principalAmount: "7884879.00",
        interestAmount: "1000000.00",
        installmentAmount: "8884879.00",
        outstandingAmount: "92115121.00",
      },
      {
        installmentNo: 12,
        dueDate: "2027-10-24",
        principalAmount: "8796907.00",
        interestAmount: "87969.00",
        installmentAmount: "8884876.00",
        outstandingAmount: "0.00",
      },
    ],
    formulaVersions: { INSTALLMENT_EFFECTIVE: "DEFAULT", INSTALLMENT_DUE_DATE: "DEFAULT" },
  },
} satisfies InstallmentSimulationResponse;
