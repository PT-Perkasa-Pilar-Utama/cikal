import { decisionSimulationResponseMock } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { choose, SIMULATE, sentBody, stubMatrix } from "../../test/decision-matrix";
import { renderApp } from "../../test/render-app";

async function openSimulation() {
  renderApp("/master/decision");
  fireEvent.click(await screen.findByRole("button", { name: "Simulate" }));
  return screen.findByRole("dialog", { name: "Decision Matrix Simulation" });
}

const AC_36_02_OUTCOMES = {
  Dedup: "UnMatch",
  Dukcapil: "Passed",
  Fraud: "Clean",
  RAC: "Pass",
  Scoring: "Pass",
  SLIK: "Collect 1",
};

describe("Decision Matrix Simulation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-36.02 runs the simulation and shows Go with the matrix row used", async () => {
    const fetch = stubMatrix({ [SIMULATE]: { status: 200, body: decisionSimulationResponseMock } });
    const dialog = await openSimulation();
    choose(dialog, AC_36_02_OUTCOMES);

    fireEvent.click(within(dialog).getByRole("button", { name: "Run" }));

    const result = await within(dialog).findByRole("region", { name: "Simulation Result" });
    expect(within(result).getByText("Go")).toBeInTheDocument();
    expect(result).toHaveTextContent(
      "Priority 4: Dedup UnMatch, Dukcapil Passed, Fraud Clean, RAC Pass, Scoring Pass, SLIK Collect 1",
    );
    expect(sentBody(fetch, SIMULATE)).toEqual({
      dedupOutcome: "UNMATCH",
      dukcapilOutcome: "PASSED",
      fraudOutcome: "CLEAN",
      racOutcome: "PASS",
      scoringOutcome: "PASS",
      creditBureauOutcome: "COLLECT_1",
      useMatrix: "ACTIVE",
    });
  });

  it("AC-36.03 shows NotGo with the default note when no row matches", async () => {
    const noMatch = {
      data: { decisionOutcome: "NOTGO", matchedRow: null, note: "No matching rule, default decision applied" },
    };
    stubMatrix({ [SIMULATE]: { status: 200, body: noMatch } });
    const dialog = await openSimulation();
    choose(dialog, { ...AC_36_02_OUTCOMES, SLIK: "Collect 3" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Run" }));

    const result = await within(dialog).findByRole("region", { name: "Simulation Result" });
    expect(within(result).getByText("NotGo")).toBeInTheDocument();
    expect(result).toHaveTextContent("No matching rule, default decision applied");
  });

  it("AC-36.04 shows Select an outcome for every module when RAC, Scoring, and SLIK are not chosen", async () => {
    const outcomeRequired = {
      status: 422,
      body: {
        code: "OUTCOME_REQUIRED",
        message: "Select an outcome for every module",
        details: [],
        correlationId: "c-1",
      },
    };
    const fetch = stubMatrix({ [SIMULATE]: outcomeRequired });
    const dialog = await openSimulation();
    choose(dialog, { Dedup: "UnMatch", Dukcapil: "Passed", Fraud: "Clean" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Run" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Select an outcome for every module");
    expect(sentBody(fetch, SIMULATE)).toEqual({
      dedupOutcome: "UNMATCH",
      dukcapilOutcome: "PASSED",
      fraudOutcome: "CLEAN",
      useMatrix: "ACTIVE",
    });
  });

  it("simulates against the pending matrix when Matrix is Pending", async () => {
    const fetch = stubMatrix({ [SIMULATE]: { status: 200, body: decisionSimulationResponseMock } });
    const dialog = await openSimulation();
    choose(dialog, { ...AC_36_02_OUTCOMES, Matrix: "Pending" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Run" }));

    await within(dialog).findByRole("region", { name: "Simulation Result" });
    expect(sentBody(fetch, SIMULATE)).toMatchObject({ useMatrix: "PENDING" });
  });
});
