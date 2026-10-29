import { validityCheckNotValidResponseMock, validityCheckValidResponseMock } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLICATION_ID,
  businessDateIn,
  disbursementRoutes,
  emptyQueue,
  errorOf,
  ownTask,
  requestOf,
  tasksKey,
} from "../../test/disbursement";
import { type ApiRoutes, renderApp, stubApi } from "../../test/render-app";

const FORM_PATH = `/operations/validity/${APPLICATION_ID}`;
const CHECK_KEY = `POST /api/v1/applications/${APPLICATION_ID}/validity-check`;
const QUEUE_KEY = tasksKey("VALIDITY_CHECK");

function renderForm(extra: ApiRoutes = {}) {
  const fetch = stubApi(disbursementRoutes({ [QUEUE_KEY]: { status: 200, body: emptyQueue }, ...extra }));
  renderApp(FORM_PATH);
  return fetch;
}

const field = (label: RegExp) => screen.getByLabelText(label);

async function fillDate(value: string) {
  fireEvent.change(await screen.findByLabelText(/^Disbursement Date/), { target: { value } });
}

async function confirmYes() {
  const dialog = await screen.findByRole("dialog", { name: "Confirmation" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Yes" }));
}

describe("Validity Check", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-76.01 opens the Validity Check Form from the Validity Check button with the Disbursement Detail", async () => {
    stubApi(disbursementRoutes({ [QUEUE_KEY]: { status: 200, body: ownTask("VALIDITY_CHECK") } }));
    renderApp("/");
    const menu = await screen.findByRole("navigation", { name: "Main menu" });
    fireEvent.click(within(menu).getByRole("link", { name: "Validity Check" }));

    fireEvent.click(await screen.findByRole("button", { name: "Validity Check" }));

    expect(await screen.findByRole("heading", { name: "Validity Check Form" })).toBeInTheDocument();
    const detail = await screen.findByRole("region", { name: "Disbursement Detail" });
    expect(detail).toHaveTextContent("20102026KPR0000041");
    expect(detail).toHaveTextContent("580.000.000");
    expect(detail).toHaveTextContent("21-11-2026");
  });

  it("AC-76.01 validates tomorrow's Disbursement Date with Valid and Yes and returns to the queue", async () => {
    const tomorrow = businessDateIn(1);
    const fetch = renderForm({ [CHECK_KEY]: { status: 200, body: validityCheckValidResponseMock } });

    await fillDate(tomorrow);
    fireEvent.click(screen.getByRole("button", { name: "Valid" }));
    await confirmYes();

    expect(await screen.findByText("Disbursement data validated")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Validity Check" })).toBeInTheDocument();
    const request = requestOf(fetch, CHECK_KEY);
    expect(request.body).toEqual({ result: "VALID", disbursementDate: tomorrow });
    expect(request.idempotent).toBe(true);
  });

  it("AC-76.02 refuses today's Disbursement Date before the confirmation", async () => {
    const fetch = renderForm();

    await fillDate(businessDateIn(0));
    fireEvent.click(screen.getByRole("button", { name: "Valid" }));

    expect(await screen.findByText("Disbursement date must be at least 1 day after today")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requestOf(fetch, CHECK_KEY).body).toBeUndefined();
  });

  it("AC-76.02 shows the server message when the date is refused", async () => {
    renderForm({
      [CHECK_KEY]: errorOf(422, "DISBURSEMENT_DATE_TOO_EARLY", "Disbursement date must be at least 1 day after today"),
    });

    await fillDate(businessDateIn(1));
    fireEvent.click(screen.getByRole("button", { name: "Valid" }));
    await confirmYes();

    expect(await screen.findByText("Disbursement date must be at least 1 day after today")).toBeInTheDocument();
  });

  it("AC-76.04 marks the data Not Valid with the Reason and returns to the queue", async () => {
    const fetch = renderForm({ [CHECK_KEY]: { status: 200, body: validityCheckNotValidResponseMock } });

    fireEvent.click(await screen.findByRole("button", { name: "Not Valid" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmation" });
    expect(within(dialog).getByRole("button", { name: "Yes" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: "Nomor rekening salah" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes" }));

    expect(await screen.findByText("Disbursement data marked as not valid")).toBeInTheDocument();
    expect(requestOf(fetch, CHECK_KEY).body).toEqual({ result: "NOT_VALID", reason: "Nomor rekening salah" });
  });

  it("AC-76.05 sends the changed First Installment Date", async () => {
    const tomorrow = businessDateIn(1);
    const fetch = renderForm({ [CHECK_KEY]: { status: 200, body: validityCheckValidResponseMock } });

    await fillDate(tomorrow);
    expect(field(/^First Installment Date/)).toHaveValue("2026-11-21");
    fireEvent.change(field(/^First Installment Date/), { target: { value: "2026-11-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Valid" }));
    await confirmYes();

    expect(await screen.findByText("Disbursement data validated")).toBeInTheDocument();
    expect(requestOf(fetch, CHECK_KEY).body).toEqual({
      result: "VALID",
      disbursementDate: tomorrow,
      firstInstallmentDate: "2026-11-25",
    });
  });

  it("AC-76.06 does not show an epolis date in the Disbursement Detail", async () => {
    renderForm();

    const detail = await screen.findByRole("region", { name: "Disbursement Detail" });
    expect(detail).not.toHaveTextContent(/epolis/i);
  });

  it("requires the Disbursement Date for Valid", async () => {
    renderForm();

    fireEvent.click(await screen.findByRole("button", { name: "Valid" }));

    expect(await screen.findByText("This field is required")).toBeInTheDocument();
  });

  it("shows the task owner message from the server", async () => {
    renderForm({
      [CHECK_KEY]: errorOf(403, "TASK_NOT_ASSIGNED_TO_YOU", "This task is assigned to another user"),
    });

    await fillDate(businessDateIn(1));
    fireEvent.click(screen.getByRole("button", { name: "Valid" }));
    await confirmYes();

    expect(await screen.findByText("This task is assigned to another user")).toBeInTheDocument();
  });
});
