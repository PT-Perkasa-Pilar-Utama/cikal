import {
  type Action,
  type ProcessMonitoringResponse,
  processFinishResponseMock,
  processMonitoringResponseMock,
  type SessionResponse,
  sessionResponseMock,
  stepRetryResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, stubApi } from "../../test/render-app";

type MonitoringRow = ProcessMonitoringResponse["data"][number];

/** Dukcapil `ERROR` attempt 3 dari contoh api-specs 13 §13.3. */
function mockErrorRow(): MonitoringRow {
  const [row] = processMonitoringResponseMock.data;
  if (!row) throw new Error("monitoring mock has no row");
  return row;
}

const dukcapilError = mockErrorRow();
const { processInstanceId } = dukcapilError;
const { stepExecutionId } = dukcapilError.currentStep;

const allList = "GET /api/v1/process-monitoring?page=1";
const errorList = "GET /api/v1/process-monitoring?status=ERROR&page=1";
const retryKey = `POST /api/v1/processes/${processInstanceId}/steps/${stepExecutionId}/retry`;
const finishKey = `POST /api/v1/processes/${processInstanceId}/finish`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Sesi Admin Operasional: menu Process Monitoring dengan hak `actions`. */
function adminOpsSession(actions: Action[]): SessionResponse {
  return {
    data: {
      ...sessionResponseMock.data,
      menus: [
        {
          menuCode: "OPS",
          menuName: "Operations",
          link: null,
          iconName: "briefcase",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "OPS-MONITORING",
              menuName: "Process Monitoring",
              link: "/operations/monitoring",
              iconName: "activity",
              actions,
              children: [],
            },
          ],
        },
      ],
    },
  };
}

/** Pengajuan Rudi menunggu Verifikator, tanpa pesan error. */
const waitingRow = {
  ...dukcapilError,
  applicationId: "0192b6b1-0001-7000-8000-000000000002",
  loanId: "20102026KTA0000014",
  processInstanceId: "0192b6b2-0001-7000-8000-000000000002",
  currentStep: {
    ...dukcapilError.currentStep,
    stepExecutionId: "0192b6b2-0004-7000-8000-000000000002",
    stepCode: "VERIFICATION",
    status: "WAITING_HUMAN",
    attempt: 1,
    errorCategory: null,
    errorMessage: null,
  },
} satisfies MonitoringRow;

const page = (data: ProcessMonitoringResponse["data"]): ProcessMonitoringResponse => ({
  data,
  meta: { page: 1, pageSize: 20, totalItems: data.length, totalPages: data.length ? 1 : 0 },
});

function stubMonitoring(actions: Action[] = ["VIEW", "UPDATE"], extra: ApiRoutes = {}) {
  const routes: ApiRoutes = {
    "GET /api/v1/auth/session": { status: 200, body: adminOpsSession(actions) },
    [allList]: { status: 200, body: page([dukcapilError, waitingRow]) },
    [errorList]: { status: 200, body: page([dukcapilError]) },
    ...extra,
  };
  return { routes, fetch: stubApi(routes) };
}

async function openDetail() {
  renderApp("/operations/monitoring");
  fireEvent.click(await screen.findByRole("button", { name: "View Detail 20102026KTA0000013" }));
  return screen.findByRole("dialog", { name: "Process Monitoring Detail" });
}

/** Nilai `<dd>` sesudah label `<dt>` di popup detail. */
const fieldValue = (dialog: HTMLElement, label: string) =>
  within(dialog).getByText(label, { selector: "dt" }).nextElementSibling;

function requestInit(fetch: ReturnType<typeof stubApi>, key: string): RequestInit | undefined {
  const call = fetch.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key);
  return call?.[1];
}

describe("Process Monitoring", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists running applications with their current step", async () => {
    stubMonitoring();
    renderApp("/operations/monitoring");

    const error = await screen.findByRole("row", { name: /20102026KTA0000013/ });
    const waiting = screen.getByRole("row", { name: /20102026KTA0000014/ });

    expect(screen.getByRole("heading", { name: "Process Monitoring" })).toBeInTheDocument();
    expect(error).toHaveTextContent("Dukcapil");
    expect(error).toHaveTextContent("Error");
    expect(waiting).toHaveTextContent("Verification");
    expect(waiting).toHaveTextContent("Waiting");
  });

  it("AC-86.04 shows only applications whose current step is Error, with the error message", async () => {
    stubMonitoring();
    renderApp("/operations/monitoring");
    await screen.findByRole("row", { name: /20102026KTA0000014/ });

    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "ERROR" } });

    const row = await screen.findByRole("row", { name: /20102026KTA0000013/ });
    expect(screen.queryByRole("row", { name: /20102026KTA0000014/ })).not.toBeInTheDocument();
    expect(row).toHaveTextContent("Error");
    expect(row).toHaveTextContent("Dukcapil service timeout");
  });

  it("AC-86.01 retries the error step, shows Step retried, and drops the application from the Error list", async () => {
    const { routes, fetch } = stubMonitoring(undefined, { [retryKey]: { status: 200, body: stepRetryResponseMock } });
    const dialog = await openDetail();
    routes[allList] = { status: 200, body: page([waitingRow]) };

    fireEvent.click(within(dialog).getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Step retried")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("row", { name: /20102026KTA0000013/ })).not.toBeInTheDocument());
    expect(new Headers(requestInit(fetch, retryKey)?.headers).get("Idempotency-Key")).toMatch(UUID);
  });

  it("AC-86.03 shows Step failed again and the attempt count grows by one", async () => {
    const failedAgain = {
      status: 422,
      body: {
        code: "STEP_FAILED_AGAIN",
        message: "Step failed again: Dukcapil service timeout",
        details: [
          { field: "attempt", code: "STEP_ATTEMPT", message: "4" },
          { field: "errorCategory", code: "TIMEOUT", message: "Dukcapil service timeout" },
        ],
        correlationId: "c-1",
      },
    };
    const { routes } = stubMonitoring(undefined, { [retryKey]: failedAgain });
    const dialog = await openDetail();
    expect(fieldValue(dialog, "Attempt")).toHaveTextContent("3");
    const fourthAttempt = {
      ...dukcapilError,
      currentStep: {
        ...dukcapilError.currentStep,
        stepExecutionId: "0192b6b2-0006-7000-8000-000000000001",
        attempt: 4,
      },
    };
    routes[allList] = { status: 200, body: page([fourthAttempt, waitingRow]) };

    fireEvent.click(within(dialog).getByRole("button", { name: "Retry" }));

    expect(await within(dialog).findByText("Step failed again: Dukcapil service timeout")).toBeInTheDocument();
    await waitFor(() => expect(fieldValue(dialog, "Attempt")).toHaveTextContent("4"));
  });

  it("AC-86.02 finishes the process with the reason and shows Process finished", async () => {
    const reason = "Data nasabah ganda, dibatalkan cabang";
    const { routes, fetch } = stubMonitoring(undefined, {
      [finishKey]: { status: 200, body: processFinishResponseMock },
    });
    const dialog = await openDetail();
    routes[allList] = { status: 200, body: page([waitingRow]) };

    fireEvent.click(within(dialog).getByRole("button", { name: "Finish" }));
    const confirm = await screen.findByRole("dialog", { name: "Finish" });
    fireEvent.change(within(confirm).getByRole("textbox", { name: "Reason" }), { target: { value: reason } });
    fireEvent.click(within(confirm).getByRole("button", { name: "Yes" }));

    expect(await screen.findByText("Process finished")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("row", { name: /20102026KTA0000013/ })).not.toBeInTheDocument());
    const init = requestInit(fetch, finishKey);
    expect(init?.body).toBe(JSON.stringify({ reason }));
    expect(new Headers(init?.headers).get("Idempotency-Key")).toMatch(UUID);
  });

  it("AC-86.02 requires a reason before finishing", async () => {
    const { fetch } = stubMonitoring();
    const dialog = await openDetail();

    fireEvent.click(within(dialog).getByRole("button", { name: "Finish" }));
    const confirm = await screen.findByRole("dialog", { name: "Finish" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Yes" }));

    expect(await within(confirm).findByText("This field is required")).toBeInTheDocument();
    expect(requestInit(fetch, finishKey)).toBeUndefined();
  });

  it("hides Retry and Finish without the Update right", async () => {
    stubMonitoring(["VIEW"]);
    const dialog = await openDetail();

    expect(within(dialog).getByText("Dukcapil service timeout")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Finish" })).not.toBeInTheDocument();
  });
});
