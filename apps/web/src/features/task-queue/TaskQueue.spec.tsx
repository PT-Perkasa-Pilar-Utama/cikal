import {
  type TaskItem,
  type TaskListResponse,
  taskAssignResponseMock,
  taskListResponseMock,
  taskReleaseResponseMock,
} from "@cikal/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, stubApi } from "../../test/render-app";
import { TaskQueue } from "./TaskQueue";

/** Tugas Verification "20102026KTA0000013" dari contoh api-specs 14 §14.2. */
function mockTask(): TaskItem {
  const [task] = taskListResponseMock.data;
  if (!task) throw new Error("task mock has no row");
  return task;
}

const baseTask = mockTask();
const taskList = "GET /api/v1/tasks?queueCode=VERIFICATION&page=1";
const assignKey = `POST /api/v1/tasks/${baseTask.id}/assign`;
const releaseKey = `POST /api/v1/tasks/${baseTask.id}/release`;
const veri01 = { id: "0192b6a2-0008-7000-8000-000000000001", username: "veri.01" };
const veri02 = { id: "0192b6a2-0008-7000-8000-000000000002", username: "veri.02" };

const openTask: TaskItem = { ...baseTask, status: "OPEN", assignedTo: null, assignedAt: null, version: 2 };
const ownedBy = (assignee: typeof veri01, allowedActions: TaskItem["allowedActions"]): TaskItem => ({
  ...baseTask,
  status: "ASSIGNED",
  assignedTo: assignee,
  assignedAt: "2026-10-21T02:00:00Z",
  version: 3,
  allowedActions,
});

const page = (data: TaskItem[]): TaskListResponse => ({
  data,
  meta: { page: 1, pageSize: 20, totalItems: data.length, totalPages: data.length ? 1 : 0 },
});

function stubQueue(tasks: TaskItem[], extra: ApiRoutes = {}) {
  const routes: ApiRoutes = { [taskList]: { status: 200, body: page(tasks) }, ...extra };
  return { routes, fetch: stubApi(routes) };
}

function renderQueue(onProceed = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TaskQueue queueCode="VERIFICATION" onProceed={onProceed} />
    </QueryClientProvider>,
  );
  return onProceed;
}

const taskRow = () => screen.findByRole("row", { name: /20102026KTA0000013/ });

function requestBody(fetch: ReturnType<typeof stubApi>, key: string): unknown {
  const call = fetch.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key);
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}

describe("TaskQueue", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists the queue tasks with their Assigned To column", async () => {
    stubQueue([ownedBy(veri01, [])]);
    renderQueue();

    const row = await taskRow();

    expect(screen.getByRole("columnheader", { name: "Assigned To" })).toBeInTheDocument();
    expect(row).toHaveTextContent("Rudi Hartono");
    expect(row).toHaveTextContent("KTA");
    expect(row).toHaveTextContent("veri.01");
  });

  it("AC-58.01 assigns the task to me, shows my name in Assigned To, and offers Proceed", async () => {
    const { routes, fetch } = stubQueue([{ ...openTask, allowedActions: ["ASSIGN"] }], {
      [assignKey]: { status: 200, body: taskAssignResponseMock },
    });
    const onProceed = renderQueue();
    const row = await taskRow();
    expect(within(row).queryByRole("button", { name: "Proceed" })).not.toBeInTheDocument();
    routes[taskList] = { status: 200, body: page([ownedBy(veri02, ["PROCEED", "RELEASE"])]) };

    fireEvent.click(within(row).getByRole("button", { name: "Assign to Me" }));

    const proceed = await within(await taskRow()).findByRole("button", { name: "Proceed" });
    expect(await taskRow()).toHaveTextContent("veri.02");
    expect(requestBody(fetch, assignKey)).toEqual({ version: 2 });
    fireEvent.click(proceed);
    expect(onProceed).toHaveBeenCalledWith(expect.objectContaining({ id: baseTask.id, loanId: "20102026KTA0000013" }));
  });

  it("AC-58.02 shows the other assignee without Assign to Me or Proceed", async () => {
    stubQueue([ownedBy(veri01, [])]);
    renderQueue();

    const row = await taskRow();

    expect(row).toHaveTextContent("veri.01");
    expect(within(row).queryByRole("button", { name: "Assign to Me" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Proceed" })).not.toBeInTheDocument();
  });

  it("AC-58.03 releases my task and clears Assigned To", async () => {
    const { routes, fetch } = stubQueue([ownedBy(veri02, ["PROCEED", "RELEASE"])], {
      [releaseKey]: { status: 200, body: taskReleaseResponseMock },
    });
    renderQueue();
    const row = await taskRow();
    routes[taskList] = { status: 200, body: page([{ ...openTask, version: 4, allowedActions: ["ASSIGN"] }]) };

    fireEvent.click(within(row).getByRole("button", { name: "Release Me" }));

    await within(await taskRow()).findByRole("button", { name: "Assign to Me" });
    expect(await taskRow()).not.toHaveTextContent("veri.02");
    expect(requestBody(fetch, releaseKey)).toEqual({ version: 3 });
  });

  it("AC-58.04 shows who took the task first and refreshes the row", async () => {
    const { routes } = stubQueue([{ ...openTask, allowedActions: ["ASSIGN"] }], {
      [assignKey]: {
        status: 409,
        body: {
          code: "TASK_ALREADY_ASSIGNED",
          message: "This task has already been assigned to veri.01",
          details: [],
          correlationId: "c-1",
        },
      },
    });
    renderQueue();
    const row = await taskRow();
    routes[taskList] = { status: 200, body: page([ownedBy(veri01, [])]) };

    fireEvent.click(within(row).getByRole("button", { name: "Assign to Me" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This task has already been assigned to veri.01");
    await waitFor(async () => expect(await taskRow()).toHaveTextContent("veri.01"));
  });

  it("AC-58.05 lets a Supervisor release a held task after Yes", async () => {
    const { routes, fetch } = stubQueue([ownedBy(veri01, ["RELEASE_OTHER"])], {
      [releaseKey]: { status: 200, body: taskReleaseResponseMock },
    });
    renderQueue();
    const row = await taskRow();
    routes[taskList] = { status: 200, body: page([{ ...openTask, version: 4, allowedActions: [] }]) };

    fireEvent.click(within(row).getByRole("button", { name: "Release" }));
    expect(requestBody(fetch, releaseKey)).toBeUndefined();
    const confirm = await screen.findByRole("dialog", { name: "Confirmation" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Yes" }));

    await waitFor(async () => expect(await taskRow()).not.toHaveTextContent("veri.01"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requestBody(fetch, releaseKey)).toEqual({ version: 3 });
  });

  it("AC-58.05 keeps the task when the Supervisor answers No", async () => {
    const { fetch } = stubQueue([ownedBy(veri01, ["RELEASE_OTHER"])]);
    renderQueue();

    fireEvent.click(within(await taskRow()).getByRole("button", { name: "Release" }));
    fireEvent.click(
      within(await screen.findByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "No" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requestBody(fetch, releaseKey)).toBeUndefined();
  });

  it("AC-58.06 shows no Release Me on a task held by someone else", async () => {
    stubQueue([ownedBy(veri01, [])]);
    renderQueue();

    const row = await taskRow();

    expect(within(row).queryByRole("button", { name: "Release Me" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Release" })).not.toBeInTheDocument();
  });

  it("shows the empty state for an empty queue", async () => {
    stubQueue([]);
    renderQueue();

    expect(await screen.findByText("No data")).toBeInTheDocument();
  });
});
