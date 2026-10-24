import type { AdapterDescriptor, AdapterOutcome } from "@cikal/contracts";
import { z } from "zod";
import type { DukcapilRequest, DukcapilResponse } from "../ports/dukcapil.port.js";

/** NIK simulasi per baris MRTM US-61; NIK lain mendapat data yang cocok penuh (TRM_DKC_001). */
export const dukcapilSimulationNiks = {
  scoreAtPassed: "3171990000000102",
  scoreInReview: "3171990000000103",
  scoreAtReview: "3171990000000104",
  scoreBelowReview: "3171990000000105",
  dateOfBirthDiffers: "3171990000000106",
  placeOfBirthDiffers: "3171990000000107",
  notFound: "3171990000000109",
  timeout: "3171990000000199",
} as const;

const MATCH: DukcapilResponse = {
  recordFound: true,
  dobMatch: true,
  pobMatch: true,
  fullNameScore: "1.0000",
  motherNameScore: "1.0000",
};

const RESPONSES: Readonly<Record<string, Partial<DukcapilResponse>>> = {
  [dukcapilSimulationNiks.scoreAtPassed]: { fullNameScore: "0.9000", motherNameScore: "0.9000" },
  [dukcapilSimulationNiks.scoreInReview]: { fullNameScore: "0.9000", motherNameScore: "0.8500" },
  [dukcapilSimulationNiks.scoreAtReview]: { fullNameScore: "0.7500", motherNameScore: "0.7500" },
  [dukcapilSimulationNiks.scoreBelowReview]: { fullNameScore: "0.7400", motherNameScore: "0.7400" },
  [dukcapilSimulationNiks.dateOfBirthDiffers]: { dobMatch: false },
  [dukcapilSimulationNiks.placeOfBirthDiffers]: { pobMatch: false },
  [dukcapilSimulationNiks.notFound]: {
    recordFound: false,
    dobMatch: false,
    pobMatch: false,
    fullNameScore: "0.0000",
    motherNameScore: "0.0000",
  },
};

/** Panggilan yang tidak pernah dijawab; Integration Registry memutusnya sebagai `TIMEOUT` (AC-61.02). */
const NEVER = new Promise<never>(() => undefined);

/**
 * Adapter simulasi `SIMULATION_M07` (technical-specs 13 §13.7, IN-03): respons per NIK dari tabel di atas, tanpa
 * jaringan. Ditolak Integration Registry di lingkungan tanpa `ALLOW_SIMULATION_ADAPTERS`.
 */
export const simulationDukcapilAdapter: AdapterDescriptor<DukcapilRequest, DukcapilResponse> = {
  providerCode: "SIMULATION_M07",
  moduleCode: "M07",
  supportedModes: ["SYNC"],
  isSimulation: true,
  settingsSchema: z.object({}),
  adapterVersion: "1.0.0",
  call(req): Promise<AdapterOutcome<DukcapilResponse>> {
    if (req.nik === dukcapilSimulationNiks.timeout) return NEVER;
    const response = { ...MATCH, ...RESPONSES[req.nik], providerReference: `SIM-${req.nik}` };
    return Promise.resolve({ ok: true, response, raw: { NIK: req.nik, ...response } });
  },
  testConnection: () => Promise.resolve(),
};
