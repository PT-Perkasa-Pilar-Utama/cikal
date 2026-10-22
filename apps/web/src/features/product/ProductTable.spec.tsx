import { productListResponseMock, sessionResponseMock } from "@cikal/contracts";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, sessionOk, stubApi } from "../../test/render-app";

const productList = "GET /api/v1/products?page=1";
const [kta] = productListResponseMock.data;

/** Sesi dengan hak menu Product tertentu (AC-09.02). */
function sessionWithProductActions(actions: string[]) {
  const menus = sessionResponseMock.data.menus.map((group) => ({
    ...group,
    children: group.children.map((menu) => (menu.menuCode === "MST-PRODUCT" ? { ...menu, actions } : menu)),
  }));
  return { status: 200, body: { data: { ...sessionResponseMock.data, menus } } };
}

describe("Product list", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the pending-submission message when editing a product that awaits approval (AC-12.06)", async () => {
    const pendingKta = { ...kta, hasPendingChange: true };
    stubApi({
      "GET /api/v1/auth/session": sessionOk,
      [productList]: { status: 200, body: { ...productListResponseMock, data: [pendingKta] } },
    });
    renderApp("/master/products");

    fireEvent.click(await screen.findByRole("button", { name: "Edit KTA" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This data has a pending submission and cannot be edited",
    );
    expect(screen.getByRole("heading", { name: "Product" })).toBeInTheDocument();
  });

  it("lists products with their category and plafond range", async () => {
    stubApi({ "GET /api/v1/auth/session": sessionOk, [productList]: { status: 200, body: productListResponseMock } });
    renderApp("/master/products");

    const row = (await screen.findByRole("cell", { name: "KTA" })).closest("tr");
    expect(row).toHaveTextContent("Non Collateral Loan");
    expect(row).toHaveTextContent("5.000.000 - 300.000.000");
  });

  it("hides New Product and the edit icon without Create and Update (AC-09.02)", async () => {
    stubApi({
      "GET /api/v1/auth/session": sessionWithProductActions(["VIEW"]),
      [productList]: { status: 200, body: productListResponseMock },
    });
    renderApp("/master/products");

    await screen.findByRole("cell", { name: "KTA" });
    expect(screen.queryByRole("link", { name: "New Product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit KTA" })).not.toBeInTheDocument();
  });

  it("shows an empty list as No data", async () => {
    stubApi({
      "GET /api/v1/auth/session": sessionOk,
      [productList]: { status: 200, body: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } } },
    });
    renderApp("/master/products");

    expect(await screen.findByText("No data")).toBeInTheDocument();
  });
});
