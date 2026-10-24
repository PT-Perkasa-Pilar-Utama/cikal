import { describe, expect, it } from "vitest";
import { configFor, describeAdapterContract, stillPendingAfter } from "../../../../../test/support/adapter-contract.js";
import { ipReputationPort } from "../ports/ip-reputation.port.js";
import { ipReputationSimulationAddresses, simulationIpReputationAdapter } from "./simulation.adapter.js";

const { timeout, ...answered } = ipReputationSimulationAddresses;

const respond = async (ipAddress: string) => {
  const outcome = await simulationIpReputationAdapter.call({ ipAddress }, configFor(simulationIpReputationAdapter));
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.response;
};

describeAdapterContract(
  simulationIpReputationAdapter,
  ipReputationPort,
  ["198.51.100.7", ...Object.values(answered)].map((ipAddress) => ({ ipAddress })),
);

describe("SIMULATION_M08", () => {
  it("answers a normal address in DKI Jakarta outside the simulation table (TRM_FRD_006)", async () => {
    expect(await respond("198.51.100.7")).toMatchObject({ isVpnOrProxy: false, province: "31", city: "3171" });
  });

  it("answers a VPN or proxy address (TRM_FRD_004)", async () => {
    expect(await respond(ipReputationSimulationAddresses.vpnOrProxy)).toMatchObject({ isVpnOrProxy: true });
  });

  it("answers an address in another province (TRM_FRD_005)", async () => {
    expect(await respond(ipReputationSimulationAddresses.otherProvince)).toMatchObject({
      isVpnOrProxy: false,
      province: "32",
    });
  });

  it("never answers the timeout address", async () => {
    const call = simulationIpReputationAdapter.call({ ipAddress: timeout }, configFor(simulationIpReputationAdapter));

    expect(await stillPendingAfter(call, 50)).toBe(true);
  });
});
