import {
  type AuditLogListResponse,
  auditLogDetailResponseMock,
  auditLogListResponseMock,
  type SessionResponse,
  sessionResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, stubApi } from "../../test/render-app";

const OCTOBER = "occurredFrom=2026-10-01&occurredTo=2026-10-31";
const PRODUCT_KEY = `GET /api/v1/audit-logs?${OCTOBER}&module=Product&page=1`;
const ITEM = auditLogListResponseMock.data[0];
const DETAIL_KEY = `GET /api/v1/audit-logs/${ITEM?.id}`;

/** Sesi Auditor dengan Audit Trail View (api-specs 01 §1.11). */
const auditorSession: StubResponse = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      menus: [
        {
          menuCode: "RPT",
          menuName: "Report",
          link: null,
          iconName: "chart-column",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "RPT-AUDIT",
              menuName: "Audit Trail",
              link: "/reports/audit-trail",
              iconName: "history",
              actions: ["VIEW"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

const periodError = (code: string, message: string): StubResponse => ({
  status: 422,
  body: { code, message, details: [], correlationId: "c-1" },
});

function renderAudit(extra: ApiRoutes = {}) {
  return stubApi({
    "GET /api/v1/auth/session": auditorSession,
    [PRODUCT_KEY]: { status: 200, body: auditLogListResponseMock },
    [DETAIL_KEY]: { status: 200, body: auditLogDetailResponseMock },
    ...extra,
  });
}

async function search(filters: { module?: string; eventType?: string; from: string; to: string }) {
  const form = await screen.findByRole("form", { name: "Audit Trail search" });
  if (filters.module) fireEvent.change(within(form).getByLabelText("Module"), { target: { value: filters.module } });
  if (filters.eventType)
    fireEvent.change(within(form).getByLabelText("Event Type"), { target: { value: filters.eventType } });
  fireEvent.change(within(form).getByLabelText(/^Period From/), { target: { value: filters.from } });
  fireEvent.change(within(form).getByLabelText(/^Period To/), { target: { value: filters.to } });
  fireEvent.click(within(form).getByRole("button", { name: "Search" }));
}

describe("Audit Trail", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-14.01 lists the Product activity of the period with Date Time, User, Action, and Record", async () => {
    renderAudit();
    renderApp("/");
    const menu = await screen.findByRole("navigation", { name: "Main menu" });
    fireEvent.click(within(menu).getByRole("link", { name: "Audit Trail" }));

    await search({ module: "Product", from: "2026-10-01", to: "2026-10-31" });

    const table = await screen.findByRole("table", { name: "Audit Trail" });
    for (const header of ["Date Time", "User", "Action", "Record"]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    const row = (await within(table).findByText("checker.001")).closest("tr");
    expect(row).toHaveTextContent("Approve");
    expect(row).toHaveTextContent("KTA");
    expect(row).toHaveTextContent("Product");
  });

  it("AC-14.02 shows the data before and after side by side with the changed field marked", async () => {
    renderAudit();
    renderApp("/reports/audit-trail");
    await search({ module: "Product", from: "2026-10-01", to: "2026-10-31" });

    fireEvent.click(await screen.findByText("checker.001"));

    const dialog = await screen.findByRole("dialog", { name: "Audit Detail" });
    expect(await within(dialog).findByRole("columnheader", { name: "Before" })).toBeInTheDocument();
    expect(within(dialog).getByRole("columnheader", { name: "After" })).toBeInTheDocument();
    const changed = within(dialog)
      .getByRole("rowheader", { name: /Limit Auto Approval/ })
      .closest("tr");
    expect(changed).toHaveAttribute("data-changed", "true");
    expect(changed).toHaveTextContent("(changed)");
    const unchanged = within(dialog)
      .getByRole("rowheader", { name: /Product Name/ })
      .closest("tr");
    expect(unchanged).not.toHaveAttribute("data-changed");
  });

  it("AC-14.03 shows End date must be on or after start date", async () => {
    renderAudit({
      "GET /api/v1/audit-logs?occurredFrom=2026-10-31&occurredTo=2026-10-01&page=1": periodError(
        "INVALID_DATE_RANGE",
        "End date must be on or after start date",
      ),
    });
    renderApp("/reports/audit-trail");

    await search({ from: "2026-10-31", to: "2026-10-01" });

    expect(await screen.findByText("End date must be on or after start date")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Audit Trail" })).not.toBeInTheDocument();
  });

  it("AC-14.04 shows Search period must not exceed 366 days", async () => {
    renderAudit({
      "GET /api/v1/audit-logs?occurredFrom=2025-01-01&occurredTo=2026-01-02&page=1": periodError(
        "DATE_RANGE_TOO_LONG",
        "Search period must not exceed 366 days",
      ),
    });
    renderApp("/reports/audit-trail");

    await search({ from: "2025-01-01", to: "2026-01-02" });

    expect(await screen.findByText("Search period must not exceed 366 days")).toBeInTheDocument();
  });

  it("AC-14.05 shows no edit or delete button in the detail", async () => {
    renderAudit();
    renderApp("/reports/audit-trail");
    await search({ module: "Product", from: "2026-10-01", to: "2026-10-31" });

    fireEvent.click(await screen.findByRole("button", { name: "Detail Approve KTA" }));

    const dialog = await screen.findByRole("dialog", { name: "Audit Detail" });
    await within(dialog).findByRole("columnheader", { name: "Before" });
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent)).toEqual(["Close"]);
    expect(within(dialog).queryByRole("button", { name: /edit|delete/i })).not.toBeInTheDocument();
  });

  it("AC-14.06 filters Authentication with Date Time, User, Action, and IP Address", async () => {
    const logins: AuditLogListResponse = {
      data: (["LOGIN", "LOGIN_FAILED", "LOGOUT"] as const).map((action, index) => ({
        id: `0192b6a6-0003-7000-8000-00000000000${index}`,
        occurredAt: "2026-10-05T02:00:00.000Z",
        user: { username: "sales.jkt01" },
        role: "Sales",
        module: "Authentication",
        eventType: "AUTHENTICATION",
        action,
        recordId: null,
        description: null,
        ipAddress: `10.30.0.${index + 1}`,
      })),
      meta: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1 },
    };
    renderAudit({
      [`GET /api/v1/audit-logs?${OCTOBER}&eventType=AUTHENTICATION&page=1`]: { status: 200, body: logins },
    });
    renderApp("/reports/audit-trail");

    const eventType = await screen.findByLabelText("Event Type");
    expect(
      within(eventType)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Select", "Master Data", "Application Action", "Authentication", "Data Access"]);
    await search({ eventType: "AUTHENTICATION", from: "2026-10-01", to: "2026-10-31" });

    const table = await screen.findByRole("table", { name: "Audit Trail" });
    expect(within(table).getByRole("columnheader", { name: "IP Address" })).toBeInTheDocument();
    const rows: [string, string][] = [
      ["Login", "10.30.0.1"],
      ["Login Failed", "10.30.0.2"],
      ["Logout", "10.30.0.3"],
    ];
    for (const [action, ip] of rows) {
      expect((await within(table).findByText(action)).closest("tr")).toHaveTextContent(ip);
    }
  });

  it("shows No data when nothing matches", async () => {
    renderAudit({
      [PRODUCT_KEY]: {
        status: 200,
        body: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      },
    });
    renderApp("/reports/audit-trail");

    await search({ module: "Product", from: "2026-10-01", to: "2026-10-31" });

    expect(await screen.findByText("No data")).toBeInTheDocument();
  });
});
