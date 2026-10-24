import { describe, expect, it } from "vitest";
import { configFor, describeAdapterContract, stillPendingAfter } from "../../../../../test/support/adapter-contract.js";
import { type DukcapilRequest, dukcapilPort } from "../ports/dukcapil.port.js";
import { dukcapilSimulationNiks, simulationDukcapilAdapter } from "./simulation.adapter.js";

const request = (nik: string): DukcapilRequest => ({
  nik,
  fullName: "Rudi Hartono",
  motherMaidenName: "Siti",
  dateOfBirth: "1990-02-14",
  placeOfBirth: "Bandung",
});
const { timeout, ...answered } = dukcapilSimulationNiks;

const respond = async (nik: string) => {
  const outcome = await simulationDukcapilAdapter.call(request(nik), configFor(simulationDukcapilAdapter));
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.response;
};

describeAdapterContract(simulationDukcapilAdapter, dukcapilPort, [
  request("3171010101900001"),
  ...Object.values(answered).map(request),
]);

describe("SIMULATION_M07", () => {
  it("answers a full match for a NIK outside the simulation table (TRM_DKC_001)", async () => {
    expect(await respond("3171010101900001")).toMatchObject({
      recordFound: true,
      dobMatch: true,
      pobMatch: true,
      fullNameScore: "1.0000",
      motherNameScore: "1.0000",
    });
  });

  it("answers the name scores of TRM_DKC_002 to TRM_DKC_005", async () => {
    const scores = async (nik: string) => {
      const { fullNameScore, motherNameScore } = await respond(nik);
      return [fullNameScore, motherNameScore];
    };
    expect(await scores(dukcapilSimulationNiks.scoreAtPassed)).toEqual(["0.9000", "0.9000"]);
    expect(await scores(dukcapilSimulationNiks.scoreInReview)).toEqual(["0.9000", "0.8500"]);
    expect(await scores(dukcapilSimulationNiks.scoreAtReview)).toEqual(["0.7500", "0.7500"]);
    expect(await scores(dukcapilSimulationNiks.scoreBelowReview)).toEqual(["0.7400", "0.7400"]);
  });

  it("answers a different date or place of birth for TRM_DKC_006 and TRM_DKC_007", async () => {
    expect(await respond(dukcapilSimulationNiks.dateOfBirthDiffers)).toMatchObject({ dobMatch: false, pobMatch: true });
    expect(await respond(dukcapilSimulationNiks.placeOfBirthDiffers)).toMatchObject({
      dobMatch: true,
      pobMatch: false,
    });
  });

  it("answers a record that is not found", async () => {
    expect(await respond(dukcapilSimulationNiks.notFound)).toMatchObject({ recordFound: false });
  });

  it("AC-61.02 never answers the timeout NIK, so the registry cuts the call as TIMEOUT", async () => {
    const call = simulationDukcapilAdapter.call(request(timeout), configFor(simulationDukcapilAdapter));

    expect(await stillPendingAfter(call, 50)).toBe(true);
  });
});
