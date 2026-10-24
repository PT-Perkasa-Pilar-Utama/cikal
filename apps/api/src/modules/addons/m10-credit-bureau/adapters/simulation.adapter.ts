import type { AdapterDescriptor, AdapterOutcome } from "@cikal/contracts";
import { z } from "zod";
import { businessDate } from "../../../../platform/clock/business-date.js";
import type { CreditBureauRequest, CreditBureauResponse, CreditFacility } from "../ports/credit-bureau.port.js";

/** NIK simulasi per baris MRTM US-68; NIK lain punya satu fasilitas aktif kolektibilitas 1 (TRM_SLK_001). */
export const creditBureauSimulationNiks = {
  collectibility2: "3171990000000202",
  collectibility3: "3171990000000203",
  collectibility5: "3171990000000205",
  noHistory: "3171990000000200",
  collectibilityOutOfRange: "3171990000000206",
  severalFacilities: "3171990000000207",
  timeout: "3171990000000299",
} as const;

const facility = (collectibility: number, condition: CreditFacility["condition"] = "ACTIVE"): CreditFacility => ({
  lenderName: "Bank Simulasi",
  facilityType: "KREDIT_KONSUMSI",
  plafond: "50000000.00",
  outstanding: condition === "ACTIVE" ? "25000000.00" : "0.00",
  collectibility,
  daysPastDue: 0,
  condition,
});

const FACILITIES: Readonly<Record<string, readonly CreditFacility[]>> = {
  [creditBureauSimulationNiks.collectibility2]: [facility(2)],
  [creditBureauSimulationNiks.collectibility3]: [facility(3)],
  [creditBureauSimulationNiks.collectibility5]: [facility(5)],
  [creditBureauSimulationNiks.noHistory]: [],
  [creditBureauSimulationNiks.collectibilityOutOfRange]: [facility(6)],
  // Fasilitas lunas tidak ikut agregasi kolektibilitas terburuk (TRM_SLK_007, CREDIT_BUREAU_AGGREGATION).
  [creditBureauSimulationNiks.severalFacilities]: [facility(1), facility(3), facility(2), facility(5, "CLOSED")],
};

/** Panggilan yang tidak pernah dijawab; Integration Registry memutusnya sebagai `TIMEOUT`. */
const NEVER = new Promise<never>(() => undefined);

/** Adapter simulasi `SIMULATION_M10` mode SYNC (technical-specs 13 §13.7, tech ref 10.5): laporan per NIK. */
export const simulationCreditBureauAdapter: AdapterDescriptor<CreditBureauRequest, CreditBureauResponse> = {
  providerCode: "SIMULATION_M10",
  moduleCode: "M10",
  supportedModes: ["SYNC"],
  isSimulation: true,
  settingsSchema: z.object({}),
  adapterVersion: "1.0.0",
  call(req): Promise<AdapterOutcome<CreditBureauResponse>> {
    if (req.nik === creditBureauSimulationNiks.timeout) return NEVER;
    const facilities = [...(FACILITIES[req.nik] ?? [facility(1)])];
    const response: CreditBureauResponse = {
      reportReference: `SIM-${req.nik}`,
      reportDate: businessDate(new Date()),
      hasHistory: facilities.length > 0,
      facilities,
    };
    return Promise.resolve({ ok: true, response, raw: { NIK: req.nik, ...response } });
  },
  testConnection: () => Promise.resolve(),
};
