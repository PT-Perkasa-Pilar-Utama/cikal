import {
  changeRequestApproveResponseMock,
  changeRequestDetailResponseMock,
  changeRequestListResponseMock,
  changeRequestRejectResponseMock,
  sessionResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, sessionOk, standardError, stubApi } from "../../test/render-app";

const requestId = changeRequestDetailResponseMock.data.id;
const productList = "GET /api/v1/change-requests?entityType=PRODUCT%2CPRODUCT_PRICING&page=1";
const roleList = "GET /api/v1/change-requests?entityType=ROLE_ACCESS&page=1";
const detail = `GET /api/v1/change-requests/${requestId}`;
const emptyList = { status: 200, body: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } } };

/** Detail permintaan baru "KPR Subsidi" yang boleh ditinjau Checker. */
const newProductDetail = {
  status: 200,
  body: {
    data: {
      ...changeRequestDetailResponseMock.data,
      action: "CREATE",
      entityId: null,
      currentData: null,
      proposedData: { productCode: "KPRS", productName: "KPR Subsidi" },
      changedFields: ["productCode", "productName"],
    },
  },
};

function pendingProductRoutes(detailResponse: StubResponse = newProductDetail): ApiRoutes {
  return {
    "GET /api/v1/auth/session": sessionOk,
    [productList]: { status: 200, body: changeRequestListResponseMock },
    [detail]: detailResponse,
  };
}

async function openDetail(name: string) {
  fireEvent.click(await screen.findByRole("button", { name: `Detail ${name}` }));
  return screen.findByRole("dialog", { name: "Detail" });
}

async function confirmWithYes(button: "Approve" | "Reject", question: string) {
  fireEvent.click(await screen.findByRole("button", { name: button }));
  const confirmation = await screen.findByRole("dialog", { name: "Confirmation" });
  expect(confirmation).toHaveTextContent(question);
  fireEvent.click(within(confirmation).getByRole("button", { name: "Yes" }));
}

describe("Pending Product", () => {
  afterEach(() => vi.restoreAllMocks());

  it("approves a new product after Yes and removes its row (AC-12.01)", async () => {
    const routes = pendingProductRoutes();
    routes[`POST /api/v1/change-requests/${requestId}/approve`] = {
      status: 200,
      body: changeRequestApproveResponseMock,
    };
    stubApi(routes);
    renderApp("/master/products/pending");
    await openDetail("KPR Subsidi");
    routes[productList] = emptyList;

    await confirmWithYes("Approve", "Are you sure you want to approve?");

    expect(await screen.findByText("Data approved")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("No data")).toBeInTheDocument();
    expect(screen.queryByText("KPR Subsidi")).not.toBeInTheDocument();
  });

  it("shows Current Data and Proposed Data with the changed Limit Auto Approval marked (AC-12.02)", async () => {
    stubApi(pendingProductRoutes({ status: 200, body: changeRequestDetailResponseMock }));
    renderApp("/master/products/pending");

    const dialog = await openDetail("KPR Subsidi");

    expect(await within(dialog).findByRole("columnheader", { name: "Current Data" })).toBeInTheDocument();
    expect(within(dialog).getByRole("columnheader", { name: "Proposed Data" })).toBeInTheDocument();
    const changed = within(dialog).getByRole("rowheader", { name: "Limit Auto Approval (changed)" }).closest("tr");
    expect(changed).toHaveAttribute("data-changed", "true");
    expect(changed).toHaveTextContent("10.000.000");
    expect(changed).toHaveTextContent("15.000.000");
    const unchanged = within(dialog).getByRole("rowheader", { name: "Product Code" }).closest("tr");
    expect(unchanged).not.toHaveAttribute("data-changed");
  });

  it("rejects a change after Yes and removes its row (AC-12.03)", async () => {
    const routes = pendingProductRoutes({ status: 200, body: changeRequestDetailResponseMock });
    routes[`POST /api/v1/change-requests/${requestId}/reject`] = {
      status: 200,
      body: changeRequestRejectResponseMock,
    };
    stubApi(routes);
    renderApp("/master/products/pending");
    await openDetail("KPR Subsidi");
    routes[productList] = emptyList;

    await confirmWithYes("Reject", "Are you sure you want to reject?");

    expect(await screen.findByText("Data rejected")).toBeInTheDocument();
    expect(await screen.findByText("No data")).toBeInTheDocument();
  });

  it("shows the already-processed message when another Checker approved first (AC-12.05)", async () => {
    const routes = pendingProductRoutes();
    routes[`POST /api/v1/change-requests/${requestId}/approve`] = standardError("ALREADY_PROCESSED");
    stubApi(routes);
    renderApp("/master/products/pending");
    const dialog = await openDetail("KPR Subsidi");

    await confirmWithYes("Approve", "Are you sure you want to approve?");

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("This submission has already been processed");
  });

  it("does not send a request when the confirmation is answered No", async () => {
    const fetchSpy = stubApi(pendingProductRoutes());
    renderApp("/master/products/pending");
    await openDetail("KPR Subsidi");

    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    fireEvent.click(
      within(await screen.findByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "No" }),
    );

    expect(screen.queryByRole("dialog", { name: "Confirmation" })).not.toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("lists a pricing change in Pending Product with status Waiting Approval (AC-97.01, AC-20.01)", async () => {
    const pricingRow = { ...changeRequestListResponseMock.data[0], entityType: "PRODUCT_PRICING", displayName: "KTA" };
    stubApi({
      "GET /api/v1/auth/session": sessionOk,
      [productList]: { status: 200, body: { ...changeRequestListResponseMock, data: [pricingRow] } },
    });
    renderApp("/master/products/pending");

    const row = (await screen.findByRole("cell", { name: "KTA" })).closest("tr");
    expect(row).toHaveTextContent("Pricing");
    expect(row).toHaveTextContent("Waiting Approval");
  });
});

describe("Pending Role Access", () => {
  afterEach(() => vi.restoreAllMocks());

  it("hides Approve, Reject, and Revise on the user's own submission and says why (AC-12.04)", async () => {
    const ownRow = {
      ...changeRequestListResponseMock.data[0],
      entityType: "ROLE_ACCESS",
      displayName: "Credit Analyst",
    };
    stubApi({
      "GET /api/v1/auth/session": sessionOk,
      [roleList]: { status: 200, body: { ...changeRequestListResponseMock, data: [ownRow] } },
      [detail]: {
        status: 200,
        body: {
          data: {
            ...changeRequestDetailResponseMock.data,
            entityType: "ROLE_ACCESS",
            submittedBy: { ...sessionResponseMock.data.user },
            canReview: false,
            reviewBlockedReason: "You cannot review your own submission",
          },
        },
      },
    });
    renderApp("/access/role-access/pending");

    const dialog = await openDetail("Credit Analyst");

    expect(await within(dialog).findByText("You cannot review your own submission")).toBeInTheDocument();
    for (const name of ["Approve", "Reject", "Revise"]) {
      expect(within(dialog).queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});
