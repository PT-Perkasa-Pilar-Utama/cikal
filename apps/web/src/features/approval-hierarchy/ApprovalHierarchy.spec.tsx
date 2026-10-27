import {
  APPROVAL_HIERARCHY_MESSAGES,
  approvalHierarchyListResponseMock,
  approverListResponseMock,
  branchListResponseMock,
  changeRequestAcceptedMock,
  changeRequestListResponseMock,
  productListResponseMock,
  type SessionResponse,
  sessionResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, stubApi } from "../../test/render-app";

const LIST_KEY = "GET /api/v1/approval-hierarchies?page=1";
const CREATE_KEY = "POST /api/v1/approval-hierarchies";
const APPROVERS_KEY = "GET /api/v1/users?withAccess=OPS-APPROVAL%3AAPPROVE&page=1&pageSize=100";
const PENDING_KEY = "GET /api/v1/change-requests?entityType=APPROVAL_HIERARCHY&page=1";

/** Sesi Maker: Approval Setup View dan Create (api-specs 01 §1.11). */
const makerSession: StubResponse = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      menus: [
        {
          menuCode: "MST",
          menuName: "Master Data",
          link: null,
          iconName: "database",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "MST-APPROVAL",
              menuName: "Approval",
              link: "/master/approvals",
              iconName: "stamp",
              actions: ["VIEW", "CREATE", "UPDATE"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

const [bandung] = branchListResponseMock.data;
const [product] = productListResponseMock.data;
const [approver] = approverListResponseMock.data;

function routes(extra: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /api/v1/auth/session": makerSession,
    [LIST_KEY]: { status: 200, body: approvalHierarchyListResponseMock },
    "GET /api/v1/branches?page=1&pageSize=100": { status: 200, body: branchListResponseMock },
    "GET /api/v1/products?page=1&pageSize=100": { status: 200, body: productListResponseMock },
    [APPROVERS_KEY]: { status: 200, body: approverListResponseMock },
    ...extra,
  };
}

function requestBody(fetch: ReturnType<typeof stubApi>, key: string): unknown {
  const call = fetch.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key);
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}

async function fillHierarchy() {
  fireEvent.change(await screen.findByLabelText(/^Branch/), { target: { value: bandung?.id } });
  fireEvent.change(screen.getByLabelText(/^Product/), { target: { value: product?.id } });
  fireEvent.change(screen.getByLabelText(/^Job Level/), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText(/^Sub Level/), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/^Approver/), { target: { value: approver?.id } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
}

const approverRow = (username: string) => screen.getByRole("row", { name: new RegExp(username) });

describe("Approval Hierarchy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-27.01 submits a New Hierarchy for approval and lists it in Pending Approval Setup", async () => {
    const pending = {
      ...changeRequestListResponseMock,
      data: changeRequestListResponseMock.data.map((item) => ({
        ...item,
        entityType: "APPROVAL_HIERARCHY",
        displayName: "011 KTA level 2.1 approver.01",
      })),
    };
    const fetch = stubApi(
      routes({
        [CREATE_KEY]: { status: 202, body: changeRequestAcceptedMock("APPROVAL_HIERARCHY", null) },
        [PENDING_KEY]: { status: 200, body: pending },
      }),
    );
    renderApp("/master/approvals");

    fireEvent.click(await screen.findByRole("link", { name: "New Hierarchy" }));
    expect(await screen.findByRole("heading", { name: "New Hierarchy" })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "approver.01" })).toBeInTheDocument();
    await fillHierarchy();

    expect(await screen.findByText("Data submitted for approval")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Approval Hierarchy" })).toBeInTheDocument();
    expect(requestBody(fetch, CREATE_KEY)).toEqual({
      branchId: bandung?.id,
      productId: product?.id,
      jobLevel: 2,
      subLevel: 1,
      approverUserId: approver?.id,
      upLevel: null,
      upSubLevel: null,
    });
    fireEvent.click(screen.getByRole("link", { name: "Pending Approval Setup" }));
    expect(await screen.findByText("011 KTA level 2.1 approver.01")).toBeInTheDocument();
  });

  it("AC-27.02 shows Selected user does not have approval access", async () => {
    const message = APPROVAL_HIERARCHY_MESSAGES.approverWithoutAccess;
    stubApi(
      routes({
        [CREATE_KEY]: {
          status: 422,
          body: { code: "APPROVER_WITHOUT_ACCESS", message, details: [], correlationId: "c-1" },
        },
      }),
    );
    renderApp("/master/approvals/new");

    await screen.findByRole("option", { name: "approver.01" });
    await fillHierarchy();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("heading", { name: "New Hierarchy" })).toBeInTheDocument();
  });

  it("AC-27.03 marks the row of an inactive approver with Inactive approver", async () => {
    stubApi(routes());
    renderApp("/master/approvals");

    expect(await screen.findByText("approver.01")).toBeInTheDocument();

    expect(within(approverRow("approver.01")).getByText("Inactive approver")).toBeInTheDocument();
    expect(within(approverRow("kepala.cabang")).queryByText("Inactive approver")).not.toBeInTheDocument();
  });

  it("offers only users with Approve access in the Approver dropdown", async () => {
    const fetch = stubApi(routes());
    renderApp("/master/approvals/new");

    expect(await screen.findByRole("option", { name: "approver.01" })).toBeInTheDocument();
    expect(fetch.mock.calls.some(([input]) => String(input).includes("withAccess=OPS-APPROVAL%3AAPPROVE"))).toBe(true);
  });
});
