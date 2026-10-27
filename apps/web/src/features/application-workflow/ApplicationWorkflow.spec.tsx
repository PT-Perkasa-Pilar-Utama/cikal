import { applicationFormResponseMock } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLICATION_ID,
  goSteps,
  INITIAL_PROCESS_ID,
  initialSteps,
  LOAN_ID,
  PROCESS,
  processOf,
  RECONTEST_PROCESS_ID,
  timeline,
  timelineStep,
  workflowRoutes,
} from "../../test/application-workflow";
import { renderApp, standardError, stubApi } from "../../test/render-app";

const WORKFLOW = `/applications/${APPLICATION_ID}/workflow`;

/** Baris timeline satu langkah menurut nama langkahnya. */
const stepRow = (name: string) => {
  const table = screen.getByRole("table", { name: "Timeline" });
  const cell = within(table).getByText(name, { selector: "button, span" });
  const row = cell.closest("tr");
  if (!row) throw new Error(`No timeline row for ${name}`);
  return row;
};

const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent);

describe("Application Workflow", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-85.01 opens the timeline from Workflow with dates, aging, actor, and result per step", async () => {
    const submitted = { data: { ...applicationFormResponseMock.data, id: APPLICATION_ID, status: "ON_PROGRESS" } };
    stubApi(workflowRoutes({ [`GET /api/v1/applications/${APPLICATION_ID}/form`]: { status: 200, body: submitted } }));
    renderApp(`/applications/${APPLICATION_ID}`);

    fireEvent.click(await screen.findByRole("link", { name: "Workflow" }));

    expect(await screen.findByRole("heading", { name: "Application Workflow" })).toBeInTheDocument();
    expect(await screen.findByText(`Loan ID: ${LOAN_ID}`)).toBeInTheDocument();
    const [dataEntryStep, dataEntryStatus, start, end, aging, actor] = cells(stepRow("Data Entry"));
    expect([dataEntryStep, dataEntryStatus, aging, actor]).toEqual(["Data Entry", "Completed", "2", "sales.jkt01"]);
    expect(start).toMatch(/^18-10-2026 \d{2}:\d{2}$/);
    expect(end).toMatch(/^20-10-2026 \d{2}:\d{2}$/);
    expect(cells(stepRow("Dedup"))).toEqual(expect.arrayContaining(["System", "UnMatch"]));
    expect(cells(stepRow("SLIK"))).toEqual(expect.arrayContaining(["Collect 1"]));
    expect(cells(stepRow("Decision"))).toEqual(expect.arrayContaining(["Go"]));
  });

  it("AC-74.01 shows the Approval step Auto Approved by System", async () => {
    const autoApproved = goSteps.map((step) =>
      step.stepCode === "APPROVAL" ? timelineStep("APPROVAL", { outcomeCode: "AUTO_APPROVED" }) : step,
    );
    stubApi(workflowRoutes({ [PROCESS]: timeline(RECONTEST_PROCESS_ID, autoApproved) }));
    renderApp(WORKFLOW);

    await screen.findByRole("table", { name: "Timeline" });

    expect(cells(stepRow("Approval"))).toEqual(expect.arrayContaining(["System", "Auto Approved"]));
  });

  it("AC-85.01 lists the route modules of the locked route version with the current step highlighted", async () => {
    stubApi(workflowRoutes());
    renderApp(WORKFLOW);

    const modules = await screen.findByRole("list", { name: "Route modules" });

    expect(screen.getByText("Route Version 2")).toBeInTheDocument();
    expect(
      within(modules)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Data Entry",
      "Dedup",
      "Dukcapil",
      "Fraud",
      "RAC",
      "Scoring",
      "SLIK",
      "Decision",
      "Approval",
      "Validity Check",
    ]);
    expect(within(modules).getByText("Validity Check")).toHaveAttribute("aria-current", "step");
    expect(stepRow("Validity Check")).toHaveAttribute("aria-current", "step");
    expect(within(modules).getByText("Approval")).not.toHaveAttribute("aria-current");
  });

  it("AC-85.02 shows Survey as Skipped - not in route", async () => {
    stubApi(workflowRoutes());
    renderApp(WORKFLOW);
    await screen.findByRole("table", { name: "Timeline" });

    const [, status, start, end] = cells(stepRow("Survey"));

    expect(status).toBe("Skipped - not in route");
    expect([start, end]).toEqual(["-", "-"]);
    expect(within(stepRow("Survey")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("AC-85.03 shows the Recontest 1 timeline and keeps the initial process selectable", async () => {
    stubApi(workflowRoutes({ [processOf(INITIAL_PROCESS_ID)]: timeline(INITIAL_PROCESS_ID, initialSteps) }));
    renderApp(WORKFLOW);
    const select = await screen.findByRole("combobox", { name: "Process" });
    expect(select).toHaveValue(RECONTEST_PROCESS_ID);
    expect(within(select).getByRole("option", { name: "Initial" })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: INITIAL_PROCESS_ID } });

    expect(await screen.findByText("NotGo")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Process" })).toHaveValue(INITIAL_PROCESS_ID);
    expect(screen.queryByText("Validity Check", { selector: "span" })).not.toBeInTheDocument();
  });

  it("AC-85.04 shows the Approval Aging in calendar days between Start Date and End Date", async () => {
    stubApi(workflowRoutes());
    renderApp(WORKFLOW);
    await screen.findByRole("table", { name: "Timeline" });

    const [, , start, end, aging] = cells(stepRow("Approval"));

    expect(start).toMatch(/^20-10-2026 /);
    expect(end).toMatch(/^22-10-2026 /);
    expect(aging).toBe("2");
  });

  it("AC-85.05 shows Process has not started for a Draft application", async () => {
    const notStarted = {
      status: 409,
      body: {
        code: "PROCESS_NOT_STARTED",
        message: "Process has not started. Submit the application to start the process",
        details: [],
        correlationId: "c-1",
      },
    };
    stubApi(workflowRoutes({ [PROCESS]: notStarted }));
    renderApp(WORKFLOW);

    expect(
      await screen.findByText("Process has not started. Submit the application to start the process"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Timeline" })).not.toBeInTheDocument();
  });

  it("shows the step error message as its result", async () => {
    const errorSteps = initialSteps.map((step) =>
      step.stepCode === "RAC"
        ? { ...step, status: "ERROR" as const, outcomeCode: null, errorMessage: "No active RAC model for product KTA" }
        : step,
    );
    stubApi(workflowRoutes({ [PROCESS]: timeline(INITIAL_PROCESS_ID, errorSteps) }));
    renderApp(WORKFLOW);
    await screen.findByRole("table", { name: "Timeline" });

    expect(cells(stepRow("RAC"))).toEqual(expect.arrayContaining(["Error", "No active RAC model for product KTA"]));
  });

  it("shows the server message when the application does not exist", async () => {
    stubApi(workflowRoutes({ [PROCESS]: standardError("NOT_FOUND") }));
    renderApp(WORKFLOW);

    expect(await screen.findByRole("alert")).toHaveTextContent("Data not found");
  });
});
