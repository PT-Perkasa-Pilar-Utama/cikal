import {
  applicationCreditBureauResponseMock,
  applicationDecisionResponseMock,
  applicationDedupResponseMock,
  applicationDukcapilResponseMock,
  applicationFraudResponseMock,
  applicationScoringResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLICATION_ID,
  INITIAL_PROCESS_ID,
  initialSteps,
  processOf,
  RECONTEST_PROCESS_ID,
  resultOf,
  timeline,
  workflowRoutes,
} from "../../test/application-workflow";
import { type ApiRoutes, renderApp, standardError, stubApi } from "../../test/render-app";

/** Membuka tab Workflow lalu mengklik langkah `stepName` di timeline. */
async function openStep(stepName: string, routes: ApiRoutes) {
  stubApi(workflowRoutes(routes));
  renderApp(`/applications/${APPLICATION_ID}/workflow`);
  const table = await screen.findByRole("table", { name: "Timeline" });
  fireEvent.click(within(table).getByRole("button", { name: stepName }));
  return screen.findByRole("dialog", { name: stepName });
}

/** Nilai `<dd>` sesudah label `<dt>` di popup hasil. */
const field = (dialog: HTMLElement, label: string) =>
  within(dialog).getByText(label, { selector: "dt" }).nextElementSibling;

const rowTexts = (dialog: HTMLElement, table: string) =>
  within(within(dialog).getByRole("table", { name: table }))
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    );

const goScoring = {
  data: { ...applicationScoringResponseMock.data, rac: { ...applicationScoringResponseMock.data.rac, result: "PASS" } },
};

describe("Application Workflow - step results", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-67.01 shows Total Score 470, Cut Off 430, Pass, and the met criteria when Scoring is clicked", async () => {
    const dialog = await openStep("Scoring", {
      [resultOf("scoring", RECONTEST_PROCESS_ID)]: { status: 200, body: goScoring },
    });

    expect(await within(dialog).findByText("470")).toBeInTheDocument();
    expect(field(dialog, "Total Score")).toHaveTextContent("470");
    expect(field(dialog, "Cut Off")).toHaveTextContent("430");
    expect(field(dialog, "Result")).toHaveTextContent("Pass");
    expect(rowTexts(dialog, "Criteria")).toEqual([
      ["Occupation is one of Karyawan Swasta, Pegawai Negeri Sipil : +100", "Karyawan Swasta", "100", "Yes"],
    ]);
  });

  it("AC-67.02 shows RAC Fail with the installment to income ratio reason", async () => {
    const dialog = await openStep("RAC", {
      [resultOf("scoring", RECONTEST_PROCESS_ID)]: { status: 200, body: applicationScoringResponseMock },
    });

    expect(await within(dialog).findByText("Fail")).toBeInTheDocument();
    expect(field(dialog, "Result")).toHaveTextContent("Fail");
    expect(within(dialog).getByRole("listitem")).toHaveTextContent(
      "Installment to Income Ratio 332% exceeds DBR max 40%",
    );
  });

  it("AC-69.01 shows Go, the Decision Matrix row used, and the next step Approval when Decision is clicked", async () => {
    const dialog = await openStep("Decision", {
      [resultOf("decision", RECONTEST_PROCESS_ID)]: { status: 200, body: applicationDecisionResponseMock },
    });

    expect(await within(dialog).findByText("Go")).toBeInTheDocument();
    expect(field(dialog, "Matrix Row")).toHaveTextContent("Priority 4");
    expect(field(dialog, "Next Step")).toHaveTextContent("Approval");
    expect(rowTexts(dialog, "Module Outcomes")).toEqual([
      ["Dedup", "UnMatch"],
      ["Dukcapil", "Passed"],
      ["Fraud", "Clean"],
      ["RAC", "Pass"],
      ["Scoring", "Pass"],
      ["SLIK", "Collect 1"],
    ]);
  });

  it("reads the result of the process chosen in Process", async () => {
    stubApi(
      workflowRoutes({
        [processOf(INITIAL_PROCESS_ID)]: timeline(INITIAL_PROCESS_ID, initialSteps),
        [resultOf("scoring", INITIAL_PROCESS_ID)]: { status: 200, body: applicationScoringResponseMock },
      }),
    );
    renderApp(`/applications/${APPLICATION_ID}/workflow`);
    fireEvent.change(await screen.findByRole("combobox", { name: "Process" }), {
      target: { value: INITIAL_PROCESS_ID },
    });
    fireEvent.click(await screen.findByRole("button", { name: "RAC" }));

    const dialog = await screen.findByRole("dialog", { name: "RAC" });
    expect(await within(dialog).findByText("Fail")).toBeInTheDocument();
  });

  it("shows the Dedup outcome, matrix row, and compared candidates", async () => {
    const dialog = await openStep("Dedup", {
      [resultOf("dedup", RECONTEST_PROCESS_ID)]: { status: 200, body: applicationDedupResponseMock },
    });

    expect(await within(dialog).findByText("Review")).toBeInTheDocument();
    expect(field(dialog, "Matched Application")).toHaveTextContent("15092026KTA0000004");
    expect(field(dialog, "Matrix Row")).toHaveTextContent("Priority 2");
    expect(rowTexts(dialog, "Candidates")).toEqual([
      ["15092026KTA0000004", "Disbursed", "Match", "Match", "Match", "0,88", "0,82"],
    ]);
  });

  it("shows the Dukcapil match results, scores, and thresholds", async () => {
    const dialog = await openStep("Dukcapil", {
      [resultOf("dukcapil", RECONTEST_PROCESS_ID)]: { status: 200, body: applicationDukcapilResponseMock },
    });

    expect(await within(dialog).findByText("Record Found")).toBeInTheDocument();
    expect(field(dialog, "Date of Birth")).toHaveTextContent("Match");
    expect(field(dialog, "Passed Threshold")).toHaveTextContent("0,9");
  });

  it("shows the Fraud blacklist, IP check, and velocity hits", async () => {
    const dialog = await openStep("Fraud", {
      [resultOf("fraud", RECONTEST_PROCESS_ID)]: { status: 200, body: applicationFraudResponseMock },
    });

    expect(await within(dialog).findByText("Blacklisted")).toBeInTheDocument();
    expect(field(dialog, "Blacklisted")).toHaveTextContent("No");
    expect(rowTexts(dialog, "Velocity")[0]?.[0]).toBe("Full Name");
  });

  it("shows the SLIK collectibility label and the reported facilities", async () => {
    const dialog = await openStep("SLIK", {
      [resultOf("credit-bureau", RECONTEST_PROCESS_ID)]: { status: 200, body: applicationCreditBureauResponseMock },
    });

    expect(await within(dialog).findByText(applicationCreditBureauResponseMock.data.label)).toBeInTheDocument();
    expect(rowTexts(dialog, "Facilities")).toHaveLength(applicationCreditBureauResponseMock.data.facilities.length);
  });

  it("shows No data for a step that has no result yet", async () => {
    const dialog = await openStep("Dedup", {
      [resultOf("dedup", RECONTEST_PROCESS_ID)]: { status: 200, body: { data: null, meta: { stepStatus: "PENDING" } } },
    });

    expect(await within(dialog).findByText("No data")).toBeInTheDocument();
  });

  it("shows the server message when the result cannot be read", async () => {
    const dialog = await openStep("Decision", {
      [resultOf("decision", RECONTEST_PROCESS_ID)]: standardError("NOT_FOUND"),
    });

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Data not found");
  });
});
