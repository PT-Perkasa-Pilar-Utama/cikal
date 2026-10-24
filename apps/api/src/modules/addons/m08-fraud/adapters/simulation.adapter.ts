import type { AdapterDescriptor, AdapterOutcome } from "@cikal/contracts";
import { z } from "zod";
import type { IpReputationRequest, IpReputationResponse } from "../ports/ip-reputation.port.js";

/** IP simulasi (blok dokumentasi RFC 5737) per baris MRTM US-65; IP lain normal di DKI Jakarta (TRM_FRD_006). */
export const ipReputationSimulationAddresses = {
  vpnOrProxy: "203.0.113.10",
  otherProvince: "203.0.113.20",
  timeout: "203.0.113.99",
} as const;

const NORMAL: IpReputationResponse = {
  isVpnOrProxy: false,
  country: "ID",
  province: "31",
  city: "3171",
  riskScore: 5,
};

const RESPONSES: Readonly<Record<string, Partial<IpReputationResponse>>> = {
  [ipReputationSimulationAddresses.vpnOrProxy]: { isVpnOrProxy: true, riskScore: 90 },
  [ipReputationSimulationAddresses.otherProvince]: { province: "32", city: "3273", riskScore: 40 },
};

/** Panggilan yang tidak pernah dijawab; Integration Registry memutusnya sebagai `TIMEOUT`. */
const NEVER = new Promise<never>(() => undefined);

/** Adapter simulasi `SIMULATION_M08` (technical-specs 13 §13.7, tech ref 10.5): respons per IP tanpa jaringan. */
export const simulationIpReputationAdapter: AdapterDescriptor<IpReputationRequest, IpReputationResponse> = {
  providerCode: "SIMULATION_M08",
  moduleCode: "M08",
  supportedModes: ["SYNC"],
  isSimulation: true,
  settingsSchema: z.object({}),
  adapterVersion: "1.0.0",
  call(req): Promise<AdapterOutcome<IpReputationResponse>> {
    if (req.ipAddress === ipReputationSimulationAddresses.timeout) return NEVER;
    const response = { ...NORMAL, ...RESPONSES[req.ipAddress] };
    return Promise.resolve({ ok: true, response, raw: { ip: req.ipAddress, ...response } });
  },
  testConnection: () => Promise.resolve(),
};
