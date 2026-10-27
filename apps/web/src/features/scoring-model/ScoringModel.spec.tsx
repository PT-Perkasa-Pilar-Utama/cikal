import {
  changeRequestAcceptedMock,
  criterionResponseMock,
  SCORING_MODEL_MESSAGES,
  type ScoringCriterion,
} from "@cikal/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, stubApi } from "../../test/render-app";
import {
  CRITERIA_KEY,
  DRAFT,
  MODEL_KEY,
  MODEL_PATH,
  modelOf,
  SUBMIT_KEY,
  scoringRoutes,
} from "../../test/scoring-model";

const ratioCriterion: ScoringCriterion = {
  id: "0192b6c6-0102-7000-8000-000000000001",
  fieldCode: "INSTALLMENT_TO_INCOME_RATIO",
  operator: "LE",
  value: { type: "VARIABLE", variableCode: "PRODUCT_DBR_MAX" },
  weight: null,
  criterionType: "MANDATORY",
  displayText: "Installment to Income Ratio <= Product DBR Max",
};

const criterionError = (code: string, message: string): StubResponse => ({
  status: 422,
  body: { code, message, details: [], correlationId: "c-1" },
});

function renderModel(extra: ApiRoutes = {}) {
  const routes = scoringRoutes(extra);
  const fetch = stubApi(routes);
  renderApp(MODEL_PATH);
  return { routes, fetch };
}

function requestBody(fetch: ReturnType<typeof stubApi>, key: string): unknown {
  const call = fetch.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key);
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}

async function openForm() {
  const add = await screen.findByRole("button", { name: "Add Criterion" });
  await waitFor(() => expect(add).toBeEnabled());
  fireEvent.click(add);
  return screen.findByRole("dialog");
}

function select(dialog: HTMLElement, label: RegExp, value: string) {
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
}

describe("Scoring Model", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens a model from the Scoring Model list and shows its criteria", async () => {
    stubApi(scoringRoutes());
    renderApp("/master/scoring");

    fireEvent.click(await screen.findByRole("link", { name: "KTA-2026" }));

    const criteria = await screen.findByRole("table", { name: "Criteria" });
    expect(within(criteria).getByText("Occupation is one of ASN, Karyawan BUMN : +50")).toBeInTheDocument();
    expect(screen.getByText("Scoring KTA 2026")).toBeInTheDocument();
  });

  it("AC-37.01 adds an Occupation is one of ASN, Karyawan BUMN criterion with weight 50", async () => {
    const { routes, fetch } = renderModel({
      [MODEL_KEY]: modelOf({ criteria: [] }),
      [CRITERIA_KEY]: { status: 201, body: criterionResponseMock },
    });

    const dialog = await openForm();
    select(dialog, /^Field/, "OCCUPATION");
    select(dialog, /^Operator/, "IN");
    fireEvent.click(await within(dialog).findByRole("checkbox", { name: "ASN" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Karyawan BUMN" }));
    fireEvent.change(within(dialog).getByLabelText(/^Weight/), { target: { value: "50" } });
    routes[MODEL_KEY] = modelOf();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Occupation is one of ASN, Karyawan BUMN : +50")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requestBody(fetch, CRITERIA_KEY)).toEqual({
      fieldCode: "OCCUPATION",
      operator: "IN",
      criterionType: "WEIGHTED",
      weight: "50",
      value: { type: "LITERAL", values: ["003", "004"] },
    });
  });

  it("AC-37.02 adds a mandatory RAC criterion comparing the ratio with Product DBR Max", async () => {
    const rac = { modelCode: "KTA-RAC", modelName: "RAC KTA", modelGroup: "RAC" as const, criteria: [] };
    const { routes, fetch } = renderModel({
      [MODEL_KEY]: modelOf(rac),
      [CRITERIA_KEY]: { status: 201, body: { data: ratioCriterion } },
    });

    const dialog = await openForm();
    select(dialog, /^Field/, "INSTALLMENT_TO_INCOME_RATIO");
    expect(within(dialog).getByRole("option", { name: "Installment to Income Ratio (%)" })).toBeInTheDocument();
    select(dialog, /^Operator/, "LE");
    expect(within(dialog).getByRole("option", { name: "less than or equal" })).toBeInTheDocument();
    select(dialog, /^Compare With/, "VARIABLE");
    select(dialog, /^Value/, "PRODUCT_DBR_MAX");
    select(dialog, /^Criterion Type/, "MANDATORY");
    routes[MODEL_KEY] = modelOf({ ...rac, criteria: [ratioCriterion] });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Installment to Income Ratio <= Product DBR Max")).toBeInTheDocument();
    expect(screen.getByText("Mandatory")).toBeInTheDocument();
    expect(requestBody(fetch, CRITERIA_KEY)).toEqual({
      fieldCode: "INSTALLMENT_TO_INCOME_RATIO",
      operator: "LE",
      criterionType: "MANDATORY",
      weight: null,
      value: { type: "VARIABLE", variableCode: "PRODUCT_DBR_MAX" },
    });
  });

  it("AC-37.03 shows Value must be a number for Monthly Income greater than lima juta", async () => {
    const message = SCORING_MODEL_MESSAGES.valueMustBeNumber;
    const { fetch } = renderModel({ [CRITERIA_KEY]: criterionError("INVALID_CRITERION_VALUE", message) });

    const dialog = await openForm();
    select(dialog, /^Field/, "MONTHLY_INCOME");
    select(dialog, /^Operator/, "GT");
    fireEvent.change(within(dialog).getByLabelText(/^Value/), { target: { value: "lima juta" } });
    fireEvent.change(within(dialog).getByLabelText(/^Weight/), { target: { value: "20" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(requestBody(fetch, CRITERIA_KEY)).toMatchObject({ value: { type: "LITERAL", value: "lima juta" } });
  });

  it("AC-37.04 shows Weight must be between -1000 and 1000 for weight 1001", async () => {
    const message = SCORING_MODEL_MESSAGES.weightOutOfRange;
    const { fetch } = renderModel({ [CRITERIA_KEY]: criterionError("WEIGHT_OUT_OF_RANGE", message) });

    const dialog = await openForm();
    select(dialog, /^Field/, "AGE");
    select(dialog, /^Operator/, "GE");
    fireEvent.change(within(dialog).getByLabelText(/^Value/), { target: { value: "21" } });
    fireEvent.change(within(dialog).getByLabelText(/^Weight/), { target: { value: "1001" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(requestBody(fetch, CRITERIA_KEY)).toMatchObject({ weight: "1001" });
  });

  it("AC-37.05 submits the draft for approval", async () => {
    renderModel({ [SUBMIT_KEY]: { status: 202, body: changeRequestAcceptedMock("SCORING_MODEL", DRAFT.id) } });

    fireEvent.click(await screen.findByRole("button", { name: "Submit for Approval" }));

    expect(await screen.findByText("Data submitted for approval")).toBeInTheDocument();
  });

  it("edits a criterion of the draft", async () => {
    const key = `PUT /api/v1/scoring-models/${DRAFT.id}/criteria/${criterionResponseMock.data.id}`;
    const { fetch } = renderModel({ [key]: { status: 200, body: criterionResponseMock } });

    fireEvent.click(await screen.findByRole("button", { name: /^Edit Occupation/ }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByRole("checkbox", { name: "ASN" })).toBeChecked();
    fireEvent.change(within(dialog).getByLabelText(/^Weight/), { target: { value: "60" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Add Criterion" });
    expect(requestBody(fetch, key)).toMatchObject({ weight: "60", value: { values: ["003", "004"] } });
  });

  it("copies an active model into a new draft version", async () => {
    const draftId = "0192b6c5-0003-7000-8000-000000000001";
    renderModel({
      [MODEL_KEY]: modelOf({ status: "ACTIVE", versionNumber: 1 }),
      [`POST /api/v1/scoring-models/${DRAFT.id}/new-version`]: modelOf({ id: draftId }),
      [`GET /api/v1/scoring-models/${draftId}`]: modelOf({ id: draftId }),
    });

    expect(await screen.findByText("1 (Active)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Criterion" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New Version" }));

    expect(await screen.findByRole("button", { name: "Add Criterion" })).toBeInTheDocument();
    expect(screen.getByText("2 (Draft)")).toBeInTheDocument();
  });
});
