import {
  APPROVAL_DECISION_MESSAGES,
  APPROVAL_MESSAGES,
  type ApplicationApproval,
  approvalDecisionResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPROVAL_KEY,
  APPROVAL_PATH,
  approvalOf,
  approvalRoutes,
  approvedApproval,
  DECISION_KEY,
  finalApproval,
  ownTask,
  TASKS_KEY,
} from "../../test/approval";
import { type ApiRoutes, renderApp, type StubResponse, stubApi } from "../../test/render-app";

const finalResult = {
  data: { decision: "APPROVE", jobLevel: 1, isFinal: true, applicationStatus: "ON_PROGRESS", nextStep: "EPOLIS" },
  message: APPROVAL_DECISION_MESSAGES.approved,
};

const decisionError = (status: number, code: string, message: string): StubResponse => ({
  status,
  body: { code, message, details: [], correlationId: "c-1" },
});

function renderDetail(extra: ApiRoutes = {}) {
  const routes = approvalRoutes(extra);
  const fetch = stubApi(routes);
  renderApp(APPROVAL_PATH);
  return { routes, fetch };
}

function decisionRequest(fetch: ReturnType<typeof stubApi>) {
  const call = fetch.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === DECISION_KEY);
  return { body: call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined, headers: call?.[1]?.headers };
}

async function comment(text: string) {
  fireEvent.change(await screen.findByLabelText(/Approval Comments/), { target: { value: text } });
}

async function decide(label: "Approve" | "Reject" | "Return") {
  fireEvent.click(await screen.findByRole("button", { name: label }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Yes" }));
}

const chainRow = (description: string) => {
  const row = within(screen.getByRole("table", { name: "Approval Chain" }))
    .getByText(description)
    .closest("tr");
  if (!row) throw new Error(`No chain row for ${description}`);
  return row;
};

describe("Approval Detail", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-72.01 opens the Approval Detail from Detail in the approver queue", async () => {
    const page = { data: [ownTask], meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } };
    stubApi(approvalRoutes({ [TASKS_KEY]: { status: 200, body: page } }));
    renderApp("/operations/approval");

    expect(await screen.findByRole("heading", { name: "Approval" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Detail" }));

    expect(await screen.findByRole("heading", { name: "Approval Detail" })).toBeInTheDocument();
    expect(await screen.findByText("20102026KTAQA0000013")).toBeInTheDocument();
    expect(screen.getByText("Rp600.000.000")).toBeInTheDocument();
  });

  it("AC-72.01 approves on the final level after Yes and shows the approved schedule ending at 0", async () => {
    const { routes, fetch } = renderDetail({ [DECISION_KEY]: { status: 200, body: finalResult } });

    await comment("Agunan memadai");
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Are you sure you want to approve this application?");
    routes[APPROVAL_KEY] = approvalOf(approvedApproval);
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes" }));

    expect(await screen.findByText("Loan application is successfully approved")).toBeInTheDocument();
    const approval = await screen.findByRole("region", { name: "Approval" });
    for (const label of ["Plafond", "Tenor", "Interest Rate", "Installment"]) {
      expect(await within(approval).findByText(label)).toBeInTheDocument();
    }
    const rows = within(within(approval).getByRole("table", { name: "Installment Schedule" })).getAllByRole("row");
    expect(rows.at(-1)?.lastElementChild).toHaveTextContent(/^0$/);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    const request = decisionRequest(fetch);
    expect(request.body).toEqual({ decision: "APPROVE", comment: "Agunan memadai" });
    expect(request.headers).toHaveProperty("Idempotency-Key");
  });

  it("AC-72.02 marks level 2 Approved after the lower level approves", async () => {
    const levelTwo: ApplicationApproval = {
      ...finalApproval,
      chain: finalApproval.chain.map((entry) => ({ ...entry, decision: "PENDING", comment: null, decidedAt: null })),
      myLevel: { jobLevel: 2, subLevel: 1, isFinalApprover: false },
    };
    const { routes } = renderDetail({
      [APPROVAL_KEY]: approvalOf(levelTwo),
      [DECISION_KEY]: { status: 200, body: approvalDecisionResponseMock },
    });

    await comment("Agunan memadai");
    routes[APPROVAL_KEY] = approvalOf({ ...finalApproval, myLevel: levelTwo.myLevel, allowedActions: [] });
    await decide("Approve");

    expect(await screen.findByText("Loan application is successfully approved")).toBeInTheDocument();
    await waitFor(() => expect(chainRow("Kepala Cabang")).toHaveTextContent("Approved"));
    expect(chainRow("Kepala Wilayah")).toHaveTextContent("Pending");
  });

  it("AC-72.03 disables Approve, Reject, and Return with Waiting for level 2 approval", async () => {
    const waiting = { ...finalApproval, allowedActions: [], blockedReason: APPROVAL_MESSAGES.waitingLowerLevel(2) };
    renderDetail({ [APPROVAL_KEY]: approvalOf(waiting) });

    expect(await screen.findByText("Waiting for level 2 approval")).toBeInTheDocument();
    for (const label of ["Approve", "Reject", "Return"]) {
      expect(screen.getByRole("button", { name: label })).toBeDisabled();
    }
  });

  it("AC-72.04 asks for Approval Comments before Approve", async () => {
    const { fetch } = renderDetail();

    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Approval comments are required");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(decisionRequest(fetch).body).toBeUndefined();
  });

  it("AC-73.01 rejects after Yes with the approver comment", async () => {
    const rejected = { decision: "REJECT", jobLevel: 1, isFinal: true, applicationStatus: "FINISHED_REJECTED" };
    const { fetch } = renderDetail({
      [DECISION_KEY]: {
        status: 200,
        body: { data: { ...rejected, nextStep: null }, message: APPROVAL_DECISION_MESSAGES.rejected },
      },
    });

    await comment("Penghasilan tidak terverifikasi");
    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Are you sure you want to reject this application?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes" }));

    expect(await screen.findByText("Loan application has been rejected")).toBeInTheDocument();
    expect(decisionRequest(fetch).body).toEqual({ decision: "REJECT", comment: "Penghasilan tidak terverifikasi" });
  });

  it("AC-73.02 returns the application to Sales after Yes", async () => {
    const returned = { decision: "RETURN", jobLevel: 1, isFinal: false, applicationStatus: "DRAFT", nextStep: null };
    const { fetch } = renderDetail({
      [DECISION_KEY]: { status: 200, body: { data: returned, message: APPROVAL_DECISION_MESSAGES.returned } },
    });

    await comment("Lengkapi rekening koran bulan September");
    await decide("Return");

    expect(await screen.findByText("Application returned to sales")).toBeInTheDocument();
    expect(decisionRequest(fetch).body).toEqual({
      decision: "RETURN",
      comment: "Lengkapi rekening koran bulan September",
    });
  });

  it("AC-73.03 hides Return when the level does not allow it", async () => {
    renderDetail({ [APPROVAL_KEY]: approvalOf({ ...finalApproval, allowedActions: ["APPROVE", "REJECT"] }) });

    expect(await screen.findByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Return" })).not.toBeInTheDocument();
  });

  it("AC-73.04 asks for Approval Comments before Reject", async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Approval comments are required");
  });

  it("AC-73.05 rejects Approval Comments longer than 1000 characters", async () => {
    renderDetail();

    await comment("a".repeat(1001));
    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Approval comments must not exceed 1000 characters");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("AC-97.05 rejects an Interest Rate outside the approver range", async () => {
    renderDetail();

    fireEvent.change(await screen.findByLabelText("Interest Rate"), { target: { value: "16" } });
    await comment("Nasabah payroll");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Interest rate must be between 11% and 15%");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("AC-97.06 sends an Interest Rate inside the approver range with the approval", async () => {
    const { fetch } = renderDetail({ [DECISION_KEY]: { status: 200, body: finalResult } });

    fireEvent.change(await screen.findByLabelText("Interest Rate"), { target: { value: "13" } });
    await comment("Nasabah payroll");
    await decide("Approve");

    expect(await screen.findByText("Loan application is successfully approved")).toBeInTheDocument();
    expect(decisionRequest(fetch).body).toEqual({
      decision: "APPROVE",
      comment: "Nasabah payroll",
      interestRate: "13.0000",
    });
  });

  it("shows the submitter reason without decision buttons", async () => {
    const submitter = { ...finalApproval, allowedActions: [], blockedReason: APPROVAL_MESSAGES.submitterCannotApprove };
    renderDetail({ [APPROVAL_KEY]: approvalOf(submitter) });

    expect(await screen.findByText("You cannot approve an application you submitted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("shows the server message when another approver decided first", async () => {
    const message = APPROVAL_DECISION_MESSAGES.alreadyProcessed;
    renderDetail({ [DECISION_KEY]: decisionError(409, "ALREADY_PROCESSED", message) });

    await comment("Agunan memadai");
    await decide("Approve");

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});
