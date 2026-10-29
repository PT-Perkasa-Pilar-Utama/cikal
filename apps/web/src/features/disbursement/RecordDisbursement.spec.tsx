import { disbursementFailedResponseMock, disbursementRecordedResponseMock } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLICATION_ID,
  detailOf,
  disbursementRoutes,
  emptyQueue,
  errorOf,
  ownTask,
  requestOf,
  tasksKey,
} from "../../test/disbursement";
import { type ApiRoutes, renderApp, stubApi } from "../../test/render-app";

const FORM_PATH = `/operations/disbursement/${APPLICATION_ID}`;
const RECORD_KEY = `POST /api/v1/applications/${APPLICATION_ID}/disbursement/record`;
const QUEUE_KEY = tasksKey("DISBURSEMENT");
const VALIDATED = detailOf({
  loanId: "20102026KTA0000013",
  disbursementDate: "2026-10-21",
  contractNumber: "011/PK/2026/000001",
  contractDate: "2026-10-20",
  bankAccountNumber: "1234567890",
});

function renderForm(extra: ApiRoutes = {}) {
  const fetch = stubApi(
    disbursementRoutes({
      [`GET /api/v1/applications/${APPLICATION_ID}/disbursement`]: VALIDATED,
      [QUEUE_KEY]: { status: 200, body: emptyQueue },
      ...extra,
    }),
  );
  renderApp(FORM_PATH);
  return fetch;
}

async function chooseResult(label: "Disbursed" | "Failed") {
  const form = await screen.findByRole("form", { name: "Record Disbursement" });
  fireEvent.change(within(form).getByLabelText(/^Result/), { target: { value: label.toUpperCase() } });
  return form;
}

function type(form: HTMLElement, label: string, value: string) {
  fireEvent.change(within(form).getByLabelText(new RegExp(`^${label}`)), { target: { value } });
}

async function submitAndConfirm(form: HTMLElement) {
  fireEvent.click(within(form).getByRole("button", { name: "Submit" }));
  const dialog = await screen.findByRole("dialog", { name: "Confirmation" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Yes" }));
}

describe("Record Disbursement", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-101.01 opens Record Disbursement for a task whose akad is printed", async () => {
    stubApi(
      disbursementRoutes({
        [`GET /api/v1/applications/${APPLICATION_ID}/disbursement`]: VALIDATED,
        [QUEUE_KEY]: { status: 200, body: ownTask("DISBURSEMENT") },
      }),
    );
    renderApp("/operations/disbursement");

    fireEvent.click(await screen.findByRole("button", { name: "Record Disbursement" }));

    const detail = await screen.findByRole("region", { name: "Disbursement Detail" });
    expect(detail).toHaveTextContent("011/PK/2026/000001");
    expect(detail).toHaveTextContent("21-10-2026");
  });

  it("AC-101.01 records Disbursed with the date and core loan number and returns to the queue", async () => {
    const fetch = renderForm({ [RECORD_KEY]: { status: 200, body: disbursementRecordedResponseMock } });

    const form = await chooseResult("Disbursed");
    type(form, "Disbursement Date", "2026-10-21");
    type(form, "Core Loan Number", "LN-0012345");
    await submitAndConfirm(form);

    expect(await screen.findByText("Disbursement recorded")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Record Disbursement" })).toBeInTheDocument();
    expect(requestOf(fetch, RECORD_KEY)).toEqual({
      body: { result: "DISBURSED", disbursementDate: "2026-10-21", coreLoanNumber: "LN-0012345" },
      idempotent: true,
    });
  });

  it("AC-101.02 records Failed with the reason", async () => {
    const fetch = renderForm({ [RECORD_KEY]: { status: 200, body: disbursementFailedResponseMock } });

    const form = await chooseResult("Failed");
    type(form, "Reason", "Rekening nasabah tidak aktif");
    await submitAndConfirm(form);

    expect(await screen.findByText("Disbursement failure recorded")).toBeInTheDocument();
    expect(requestOf(fetch, RECORD_KEY).body).toEqual({ result: "FAILED", reason: "Rekening nasabah tidak aktif" });
  });

  it("AC-101.03 shows This field is required under every empty required field", async () => {
    const fetch = renderForm();

    const form = await chooseResult("Disbursed");
    fireEvent.click(within(form).getByRole("button", { name: "Submit" }));

    expect(within(form).getAllByText("This field is required")).toHaveLength(2);
    expect(within(form).getByLabelText(/^Disbursement Date/)).toHaveAttribute("aria-invalid", "true");
    expect(within(form).getByLabelText(/^Core Loan Number/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requestOf(fetch, RECORD_KEY).body).toBeUndefined();
  });

  it("AC-101.04 shows the validated date message from the server", async () => {
    const message = "Disbursement date must not be earlier than the validated date (21-10-2026)";
    renderForm({ [RECORD_KEY]: errorOf(422, "DISBURSEMENT_BEFORE_VALIDATED_DATE", message) });

    const form = await chooseResult("Disbursed");
    type(form, "Disbursement Date", "2026-10-20");
    type(form, "Core Loan Number", "LN-0012345");
    await submitAndConfirm(form);

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("AC-101.05 shows Reason is required for Failed without a reason", async () => {
    const fetch = renderForm();

    const form = await chooseResult("Failed");
    fireEvent.click(within(form).getByRole("button", { name: "Submit" }));

    expect(within(form).getByText("Reason is required")).toBeInTheDocument();
    expect(requestOf(fetch, RECORD_KEY).body).toBeUndefined();
  });

  it("requires a Result before Submit", async () => {
    renderForm();

    const form = await screen.findByRole("form", { name: "Record Disbursement" });
    fireEvent.click(within(form).getByRole("button", { name: "Submit" }));

    expect(within(form).getByText("This field is required")).toBeInTheDocument();
  });
});
