import { describe, expect, it } from "vitest";
import { configFor, describeAdapterContract, stillPendingAfter } from "../../../../../test/support/adapter-contract.js";
import { type CreditBureauRequest, creditBureauPort } from "../ports/credit-bureau.port.js";
import { creditBureauSimulationNiks, simulationCreditBureauAdapter } from "./simulation.adapter.js";

const request = (nik: string): CreditBureauRequest => ({
  nik,
  fullName: "Rudi Hartono",
  dateOfBirth: "1990-02-14",
  placeOfBirth: "Bandung",
  motherMaidenName: "Siti",
  purposeCode: "KONSUMSI",
});
const { timeout, ...answered } = creditBureauSimulationNiks;

const respond = async (nik: string) => {
  const outcome = await simulationCreditBureauAdapter.call(request(nik), configFor(simulationCreditBureauAdapter));
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.response;
};
const collectibilities = async (nik: string) =>
  (await respond(nik)).facilities.map((facility) => `${facility.collectibility}/${facility.condition}`);

describeAdapterContract(simulationCreditBureauAdapter, creditBureauPort, [
  request("3171010101900001"),
  ...Object.values(answered).map(request),
]);

describe("SIMULATION_M10", () => {
  it("answers one active facility with collectibility 1 outside the simulation table (TRM_SLK_001)", async () => {
    expect(await collectibilities("3171010101900001")).toEqual(["1/ACTIVE"]);
  });

  it("answers the collectibility of TRM_SLK_002 to TRM_SLK_004 and TRM_SLK_006", async () => {
    expect(await collectibilities(creditBureauSimulationNiks.collectibility2)).toEqual(["2/ACTIVE"]);
    expect(await collectibilities(creditBureauSimulationNiks.collectibility3)).toEqual(["3/ACTIVE"]);
    expect(await collectibilities(creditBureauSimulationNiks.collectibility5)).toEqual(["5/ACTIVE"]);
    expect(await collectibilities(creditBureauSimulationNiks.collectibilityOutOfRange)).toEqual(["6/ACTIVE"]);
  });

  it("answers no credit history (TRM_SLK_005)", async () => {
    expect(await respond(creditBureauSimulationNiks.noHistory)).toMatchObject({ hasHistory: false, facilities: [] });
  });

  it("answers several facilities with a closed one for the worst-collectibility rule (TRM_SLK_007)", async () => {
    expect(await collectibilities(creditBureauSimulationNiks.severalFacilities)).toEqual([
      "1/ACTIVE",
      "3/ACTIVE",
      "2/ACTIVE",
      "5/CLOSED",
    ]);
  });

  it("never answers the timeout NIK", async () => {
    const call = simulationCreditBureauAdapter.call(request(timeout), configFor(simulationCreditBureauAdapter));

    expect(await stillPendingAfter(call, 50)).toBe(true);
  });
});
