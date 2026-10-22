import {
  changeRequestAcceptedMock,
  menuTreeResponseMock,
  roleAccessListResponseMock,
  roleListResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, sessionOk, stubApi } from "../../test/render-app";

const [, checker] = roleListResponseMock.data;
const [masterData] = menuTreeResponseMock.data;
const product = masterData?.children[0];

function routes(submit: ApiRoutes[string]): ApiRoutes {
  return {
    "GET /api/v1/auth/session": sessionOk,
    "GET /api/v1/roles?pageSize=100": { status: 200, body: roleListResponseMock },
    "GET /api/v1/menus": { status: 200, body: menuTreeResponseMock },
    "POST /api/v1/role-access": submit,
    "GET /api/v1/role-access?page=1": { status: 200, body: roleAccessListResponseMock },
  };
}

const accepted = { status: 202, body: changeRequestAcceptedMock("ROLE_ACCESS", null) };

async function choose(label: string, option: string) {
  // Label wajib berakhiran `*`; regex tertutup agar "Role" tidak mengenai form "Role Access".
  fireEvent.change(await screen.findByLabelText(new RegExp(`^${label}\\*?$`)), {
    target: { value: screen.getByRole("option", { name: option }).getAttribute("value") },
  });
}

/** Pilih "Checker", "Master Data", dan "Product" seperti AC-09.01, lalu nyalakan toggle `toggles`. */
async function fillForm(toggles: string[]) {
  await screen.findByRole("form", { name: "Role Access" });
  await choose("Role", "Checker");
  await choose("Menu", "Master Data");
  await choose("Sub Menu", "Product");
  for (const name of toggles) fireEvent.click(screen.getByRole("switch", { name }));
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }));

function postedBody(fetchSpy: ReturnType<typeof stubApi>): unknown {
  const call = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST");
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

describe("New Role Access", () => {
  afterEach(() => vi.restoreAllMocks());

  it("submits View and Approve on a sub menu and shows the message on Role Access (AC-09.01)", async () => {
    const fetchSpy = stubApi(routes(accepted));
    renderApp("/access/role-access/new");
    await fillForm(["View", "Approve"]);

    submit();

    expect(await screen.findByRole("heading", { name: "Role Access" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Data submitted for approval");
    expect(postedBody(fetchSpy)).toEqual({
      roleId: checker?.id,
      menuId: product?.id,
      canView: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canApprove: true,
    });
  });

  it("shows the server message for Approve without View (AC-09.03)", async () => {
    const message = "View access is required when other access is granted";
    stubApi(
      routes({ status: 422, body: { code: "VIEW_ACCESS_REQUIRED", message, details: [], correlationId: "c-1" } }),
    );
    renderApp("/access/role-access/new");
    await fillForm(["Approve"]);

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("asks for the sub menu of a menu that has sub menus and sends nothing", async () => {
    const fetchSpy = stubApi(routes(accepted));
    renderApp("/access/role-access/new");
    await screen.findByRole("form", { name: "Role Access" });
    await choose("Role", "Checker");
    await choose("Menu", "Master Data");

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Please complete all required fields");
    expect(postedBody(fetchSpy)).toBeUndefined();
  });
});

describe("Role Access list", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows each role's menu, sub menu, and granted actions", async () => {
    stubApi(routes(accepted));
    renderApp("/access/role-access");

    const row = (await screen.findByRole("cell", { name: "Checker" })).closest("tr");

    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement);
    expect(cells.getByRole("cell", { name: "Master Data" })).toBeInTheDocument();
    expect(cells.getByRole("cell", { name: "Product" })).toBeInTheDocument();
    expect(cells.getByLabelText("View granted")).toBeInTheDocument();
    expect(cells.getByLabelText("Create not granted")).toBeInTheDocument();
    expect(cells.getByLabelText("Approve granted")).toBeInTheDocument();
  });
});
