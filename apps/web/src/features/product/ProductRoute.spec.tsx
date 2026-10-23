import {
  type ProductRouteResponse,
  productListResponseMock,
  productRouteResponseMock,
  sessionResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, sessionOk, stubApi } from "../../test/render-app";

const [kta] = productListResponseMock.data;
const productOptions = "GET /api/v1/products?page=1&pageSize=100";
const routePath = `/api/v1/products/${kta?.id}/route`;

type RouteStep = ProductRouteResponse["data"]["steps"][number];

const step = (stepCode: RouteStep["stepCode"], moduleCode: RouteStep["moduleCode"], order: number): RouteStep => ({
  stepCode,
  moduleCode,
  order,
  isEnabled: true,
  isMandatory: false,
  isConditional: false,
});

/** Rute KTA versi 2 dengan Survey berlisensi dan menyala, serta SIKP bersyarat (AC-31.01). */
const ktaRoute = {
  data: {
    ...productRouteResponseMock.data,
    steps: [
      { ...step("DATA_ENTRY", "CORE", 1), isMandatory: true },
      step("SURVEY", "M05", 2),
      { ...step("CREDIT_BUREAU", "M10", 10), isEnabled: false },
      { ...step("SIKP", "M12", 12), isConditional: true },
      { ...step("APPROVAL", "CORE", 13), isMandatory: true },
    ],
  },
} satisfies ProductRouteResponse;

const ROUTE_SUBMITTED = {
  status: 202,
  body: {
    data: {
      changeRequestId: "0192b6a8-0001-7000-8000-000000000003",
      entityType: "ROUTE",
      entityId: kta?.id,
      status: "WAITING_APPROVAL",
      versionNumber: 3,
    },
    message: "Route version 3 submitted for approval",
  },
};

/** Sesi Checker: menu Product Route hanya View dan Approve (api-specs 01 §1.11). */
const checkerSession = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      menus: sessionResponseMock.data.menus.map((group) => ({
        ...group,
        children: group.children.map((menu) =>
          menu.menuCode === "MST-ROUTE" ? { ...menu, actions: ["VIEW", "APPROVE"] } : menu,
        ),
      })),
    },
  },
};

function routeRoutes(route: StubResponse = { status: 200, body: ktaRoute }, put?: StubResponse): ApiRoutes {
  return {
    "GET /api/v1/auth/session": sessionOk,
    [productOptions]: { status: 200, body: productListResponseMock },
    [`GET ${routePath}`]: route,
    ...(put ? { [`PUT ${routePath}`]: put } : {}),
  };
}

async function selectKta() {
  renderApp("/master/routes");
  const select = await screen.findByLabelText("Product");
  await screen.findByRole("option", { name: "KTA - Kredit Tanpa Agunan" });
  fireEvent.change(select, { target: { value: kta?.id } });
  return screen.findByRole("table", { name: "Route modules" });
}

async function editRoute() {
  await selectKta();
  fireEvent.click(screen.getByRole("button", { name: "Edit Route" }));
}

const moduleRow = (table: HTMLElement, name: string) => within(table).getByRole("row", { name: new RegExp(name) });

describe("Product Route", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists the route modules in order with their status", async () => {
    stubApi(routeRoutes());

    const table = await selectKta();

    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[1]?.textContent)).toEqual([
      "Data EntryMandatory",
      "Survey",
      "Credit Bureau",
      "SIKP",
      "ApprovalMandatory",
    ]);
    expect(moduleRow(table, "Survey")).toHaveTextContent("Active");
    expect(moduleRow(table, "SIKP")).toHaveTextContent("Conditional");
    expect(moduleRow(table, "Credit Bureau")).toHaveTextContent("Off");
    expect(screen.getByText("Version 2")).toBeInTheDocument();
  });

  it("submits route version 3 with Survey turned off (AC-31.01)", async () => {
    const fetchSpy = stubApi(routeRoutes(undefined, ROUTE_SUBMITTED));
    await editRoute();

    fireEvent.click(screen.getByRole("switch", { name: "Survey" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit for Approval" }));

    expect(await screen.findByText("Route version 3 submitted for approval")).toBeInTheDocument();
    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      steps: [
        { stepCode: "DATA_ENTRY", isEnabled: true },
        { stepCode: "SURVEY", isEnabled: false },
        { stepCode: "CREDIT_BUREAU", isEnabled: false },
        { stepCode: "SIKP", isEnabled: true },
        { stepCode: "APPROVAL", isEnabled: true },
      ],
    });
    expect(screen.queryByRole("button", { name: "Submit for Approval" })).not.toBeInTheDocument();
  });

  it("keeps the Approval toggle on and explains it is mandatory (AC-31.02)", async () => {
    stubApi(routeRoutes());
    await editRoute();

    const approval = screen.getByRole("switch", { name: "Approval" });
    fireEvent.click(approval);

    expect(screen.getByText("Approval is a mandatory module and cannot be turned off")).toBeInTheDocument();
    expect(approval).toHaveAttribute("aria-checked", "true");
  });

  it("shows No changes to submit when the route is submitted unchanged (AC-31.05)", async () => {
    stubApi(
      routeRoutes(undefined, {
        status: 422,
        body: { code: "NO_CHANGES", message: "No changes to submit", details: [], correlationId: "c-1" },
      }),
    );
    await editRoute();

    fireEvent.click(screen.getByRole("button", { name: "Submit for Approval" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No changes to submit");
    expect(screen.getByRole("button", { name: "Submit for Approval" })).toBeInTheDocument();
  });

  it("shows the route without Edit Route to a user without Update access (AC-31.06)", async () => {
    stubApi({ ...routeRoutes(), "GET /api/v1/auth/session": checkerSession });

    const table = await selectKta();

    expect(moduleRow(table, "Survey")).toHaveTextContent("Active");
    expect(screen.queryByRole("button", { name: "Edit Route" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("restores the active route when the edit is cancelled", async () => {
    stubApi(routeRoutes());
    await editRoute();

    fireEvent.click(screen.getByRole("switch", { name: "Survey" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(moduleRow(screen.getByRole("table", { name: "Route modules" }), "Survey")).toHaveTextContent("Active");
  });

  it("blocks Edit Route while another route version awaits approval", async () => {
    stubApi(routeRoutes({ status: 200, body: { data: { ...ktaRoute.data, pendingVersionNumber: 3 } } }));
    await selectKta();
    expect(screen.getByText("Version 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Route" }));

    expect(screen.getByRole("alert")).toHaveTextContent("This data has a pending submission and cannot be edited");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows Route not found for a product without a route", async () => {
    stubApi(
      routeRoutes({
        status: 404,
        body: { code: "NOT_FOUND", message: "Route not found", details: [], correlationId: "c-1" },
      }),
    );
    renderApp("/master/routes");
    const select = await screen.findByLabelText("Product");
    await screen.findByRole("option", { name: "KTA - Kredit Tanpa Agunan" });

    fireEvent.change(select, { target: { value: kta?.id } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Route not found");
  });
});
