import { type ScoringModelTest, type ScoringModelTestResponse, scoringModelTestResponseMock } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, type StubResponse, stubApi } from "../../test/render-app";
import { DRAFT, MODEL_PATH, scoringRoutes } from "../../test/scoring-model";

const TEST_PATH = `${MODEL_PATH}/test`;
const TEST_KEY = `POST /api/v1/scoring-models/${DRAFT.id}/test`;
const SAMPLE_LOAN_ID = "15122025KTA0000013";

const testResult = (result: Partial<ScoringModelTest> = {}): StubResponse => ({
  status: 200,
  body: { data: { ...scoringModelTestResponseMock.data, ...result } } satisfies ScoringModelTestResponse,
});

function runTest(response: StubResponse, loanId = SAMPLE_LOAN_ID) {
  const fetch = stubApi(scoringRoutes({ [TEST_KEY]: response }));
  renderApp(TEST_PATH);
  return {
    fetch,
    run: async () => {
      fireEvent.change(await screen.findByLabelText(/^Sample Application/), { target: { value: loanId } });
      fireEvent.click(screen.getByRole("button", { name: "Run Test" }));
    },
  };
}

const field = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;

describe("Scoring Model Test", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens Scoring Model Test from the model detail", async () => {
    stubApi(scoringRoutes());
    renderApp(MODEL_PATH);

    fireEvent.click(await screen.findByRole("link", { name: "Scoring Model Test" }));

    expect(await screen.findByRole("heading", { name: "Scoring Model Test" })).toBeInTheDocument();
    expect(screen.getByText(`${DRAFT.modelCode} v${DRAFT.versionNumber}`)).toBeInTheDocument();
  });

  it("AC-38.01 shows Total Score, Constant 200, Cut Off 430, the result, and the met criteria with weights", async () => {
    const { fetch, run } = runTest(testResult());
    await run();

    expect(await screen.findByText("Total Score")).toBeInTheDocument();
    expect(field("Total Score")).toHaveTextContent("470");
    expect(field("Constant")).toHaveTextContent("200");
    expect(field("Cut Off")).toHaveTextContent("430");
    expect(field("Result")).toHaveTextContent("Pass");
    const criteria = screen.getByRole("table", { name: "Criteria" });
    const row = within(criteria).getByText("Occupation is one of ASN, Karyawan BUMN : +50").closest("tr");
    expect(row).toHaveTextContent("ASN");
    expect(row).toHaveTextContent("50");
    expect(row).toHaveTextContent("Yes");
    const call = fetch.mock.calls.find(([input, init]) => `${init?.method} ${String(input)}` === TEST_KEY);
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ sampleLoanId: SAMPLE_LOAN_ID });
  });

  it("AC-38.02 shows Pass when the score equals the Cut Off", async () => {
    const { run } = runTest(testResult({ totalScore: "430.00", result: "PASS" }));
    await run();

    expect(await screen.findByText("Total Score")).toBeInTheDocument();
    expect(field("Total Score")).toHaveTextContent("430");
    expect(field("Result")).toHaveTextContent("Pass");
  });

  it("AC-38.03 shows Fail when the score is one point below the Cut Off", async () => {
    const { run } = runTest(testResult({ totalScore: "429.00", result: "FAIL" }));
    await run();

    expect(await screen.findByText("Total Score")).toBeInTheDocument();
    expect(field("Total Score")).toHaveTextContent("429");
    expect(field("Result")).toHaveTextContent("Fail");
  });

  it("AC-38.04 shows Application not found for an unknown Loan ID", async () => {
    const { run } = runTest(
      {
        status: 404,
        body: { code: "APPLICATION_NOT_FOUND", message: "Application not found", details: [], correlationId: "c-1" },
      },
      "LOANTIDAKADA",
    );
    await run();

    expect(await screen.findByText("Application not found")).toBeInTheDocument();
    expect(screen.queryByText("Total Score")).not.toBeInTheDocument();
  });

  it("shows the Cut Off detail when the scoring model has no Cut Off", async () => {
    const { run } = runTest({
      status: 400,
      body: {
        code: "VALIDATION_FAILED",
        message: "Validation failed",
        details: [{ field: "cutOff", code: "REQUIRED", message: "Cut Off is required for a scoring model" }],
        correlationId: "c-1",
      },
    });
    await run();

    expect(await screen.findByText("Cut Off is required for a scoring model")).toBeInTheDocument();
  });

  it("shows only the result for a RAC model", async () => {
    const { run } = runTest(
      testResult({
        modelGroup: "RAC",
        constant: null,
        cutOff: null,
        totalScore: null,
        result: "FAIL",
        criteria: scoringModelTestResponseMock.data.criteria.map((c) => ({ ...c, isMet: false, appliedWeight: null })),
      }),
    );
    await run();

    expect(await screen.findByText("Result", { selector: "dt" })).toBeInTheDocument();
    expect(field("Result")).toHaveTextContent("Fail");
    expect(screen.queryByText("Total Score")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Score" })).not.toBeInTheDocument();
  });

  it("keeps Run Test disabled until a Sample Application is typed", async () => {
    stubApi(scoringRoutes());
    renderApp(TEST_PATH);

    expect(await screen.findByRole("button", { name: "Run Test" })).toBeDisabled();
  });
});
