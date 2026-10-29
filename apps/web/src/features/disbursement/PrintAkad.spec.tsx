import { akadPrintResponseMock, type ParameterOptionsResponse, type UserListResponse } from "@cikal/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLICATION_ID,
  disbursementRoutes,
  emptyQueue,
  errorOf,
  ownTask,
  requestOf,
  tasksKey,
} from "../../test/disbursement";
import { type ApiRoutes, renderApp, stubApi } from "../../test/render-app";

const PRINT_KEY = `POST /api/v1/applications/${APPLICATION_ID}/akad/print`;
const QUEUE_KEY = tasksKey("PRINT_AKAD");
const RISK_MANAGER_ID = "0192b6a2-0011-7000-8000-000000000001";

const formRoutes = (extra: ApiRoutes = {}): ApiRoutes =>
  disbursementRoutes({
    [QUEUE_KEY]: { status: 200, body: ownTask("PRINT_AKAD") },
    "GET /api/v1/parameters/Payment%20Method/options": {
      status: 200,
      body: { data: [{ paramId: "001", paramValue: "Transfer", isActive: true }] } satisfies ParameterOptionsResponse,
    },
    "GET /api/v1/users?withAccess=OPS-RECONTEST:UPDATE&pageSize=100": {
      status: 200,
      body: {
        data: [
          {
            id: RISK_MANAGER_ID,
            username: "risk.manager",
            fullName: "Indah Risk Manager",
            roleName: "Risk Manager",
            branchCode: null,
            status: "ACTIVE",
          },
        ],
        meta: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
      } satisfies UserListResponse,
    },
    ...extra,
  });

/** Dari antrean Print Akad: "View Detail" lalu "Print Akad" membuka "Print Akad Form" (AC-77.01). */
async function openForm(extra: ApiRoutes = {}) {
  const routes = formRoutes(extra);
  const fetch = stubApi(routes);
  renderApp("/operations/print-akad");
  fireEvent.click(await screen.findByRole("button", { name: "View Detail" }));
  fireEvent.click(await screen.findByRole("button", { name: "Print Akad" }));
  const dialog = await screen.findByRole("dialog", { name: "Print Akad Form" });
  await within(dialog).findByRole("option", { name: "Indah Risk Manager" });
  await within(dialog).findByRole("option", { name: "Transfer" });
  return { fetch, dialog, routes };
}

function fill(dialog: HTMLElement, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${label}`)), { target: { value } });
  }
}

const ALL_FIELDS = {
  "Payment Method": "001",
  "Bank Account No": "1234567890",
  "Customer Account No": "9876543210",
  "Risk Manager": RISK_MANAGER_ID,
};

describe("Print Akad", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-77.01 prints the akad, downloads the PDF from the signed URL, and returns to the queue", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { dialog, routes } = await openForm({ [PRINT_KEY]: { status: 200, body: akadPrintResponseMock } });
    expect(screen.getByRole("heading", { name: "Print Akad" })).toBeInTheDocument();

    fill(dialog, ALL_FIELDS);
    routes[QUEUE_KEY] = { status: 200, body: emptyQueue };
    fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));

    await waitFor(() => expect(open).toHaveBeenCalledWith(akadPrintResponseMock.data.downloadUrl, "_self"));
    expect(await screen.findByText("No data")).toBeInTheDocument();
  });

  it("AC-77.01 sends the four print fields with an Idempotency-Key", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const { fetch, dialog } = await openForm({ [PRINT_KEY]: { status: 200, body: akadPrintResponseMock } });

    fill(dialog, ALL_FIELDS);
    fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));

    await waitFor(() => expect(requestOf(fetch, PRINT_KEY).body).toBeDefined());
    expect(requestOf(fetch, PRINT_KEY)).toEqual({
      body: {
        paymentMethod: "001",
        bankAccountNumber: "1234567890",
        customerAccountNumber: "9876543210",
        riskManagerUserId: RISK_MANAGER_ID,
      },
      idempotent: true,
    });
  });

  it("AC-77.02 shows This field is required under Risk Manager", async () => {
    const { fetch, dialog } = await openForm();

    const { "Risk Manager": _, ...withoutRiskManager } = ALL_FIELDS;
    fill(dialog, withoutRiskManager);
    fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));

    const riskManager = within(dialog).getByLabelText(/^Risk Manager/);
    expect(riskManager).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getAllByText("This field is required")).toHaveLength(1);
    expect(requestOf(fetch, PRINT_KEY).body).toBeUndefined();
  });

  it("AC-77.02 shows the server field message under the field", async () => {
    const { dialog } = await openForm({
      [PRINT_KEY]: errorOf(400, "VALIDATION_FAILED", "Validation failed", [
        { field: "riskManagerUserId", code: "INVALID", message: "Risk Manager is not available" },
      ]),
    });

    fill(dialog, ALL_FIELDS);
    fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));

    expect(await within(dialog).findByText("Risk Manager is not available")).toBeInTheDocument();
  });

  it("shows Document template AKAD-KPR is not available", async () => {
    const { dialog } = await openForm({
      [PRINT_KEY]: errorOf(422, "TEMPLATE_NOT_AVAILABLE", "Document template AKAD-KPR is not available"),
    });

    fill(dialog, ALL_FIELDS);
    fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));

    expect(await within(dialog).findByText("Document template AKAD-KPR is not available")).toBeInTheDocument();
  });
});
