import {
  changeRequestDetailResponseMock,
  changeRequestListResponseMock,
  productIdMock,
  type RouteChangeData,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, sessionOk, stubApi } from "../../test/render-app";

const requestId = changeRequestDetailResponseMock.data.id;
const routeList = "GET /api/v1/change-requests?entityType=ROUTE&page=1";

const routeData = (versionNumber: number, surveyOn: boolean): RouteChangeData => ({
  productCode: "KTA",
  productName: "Kredit Tanpa Agunan",
  versionId: `0192b6a6-0001-7000-8000-00000000000${versionNumber}`,
  versionNumber,
  effectiveFrom: null,
  steps: [
    { stepCode: "DATA_ENTRY", isEnabled: true },
    { stepCode: "SURVEY", isEnabled: surveyOn },
    { stepCode: "APPROVAL", isEnabled: true },
  ],
});

const cellTexts = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent);

/** Rute KTA versi 3 yang mematikan Survey menunggu persetujuan (AC-31.01). */
function stubPendingRoute() {
  stubApi({
    "GET /api/v1/auth/session": sessionOk,
    [routeList]: {
      status: 200,
      body: {
        ...changeRequestListResponseMock,
        data: changeRequestListResponseMock.data.map((item) => ({
          ...item,
          entityType: "ROUTE",
          entityId: productIdMock,
          action: "UPDATE",
          displayName: "Kredit Tanpa Agunan",
        })),
      },
    },
    [`GET /api/v1/change-requests/${requestId}`]: {
      status: 200,
      body: {
        data: {
          ...changeRequestDetailResponseMock.data,
          entityType: "ROUTE",
          currentData: routeData(2, true),
          proposedData: routeData(3, false),
          changedFields: ["steps.SURVEY"],
        },
      },
    },
  });
}

describe("Pending Product Route", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists route version 3 as Waiting Approval (AC-31.01)", async () => {
    stubPendingRoute();
    renderApp("/master/routes/pending");

    const row = await screen.findByRole("row", { name: /Kredit Tanpa Agunan/ });

    expect(screen.getByRole("heading", { name: "Pending Product Route" })).toBeInTheDocument();
    expect(row).toHaveTextContent("Route");
    expect(row).toHaveTextContent("Waiting Approval");
  });

  it("compares the module list of version 2 and version 3 with Survey marked changed (AC-31.01)", async () => {
    stubPendingRoute();
    renderApp("/master/routes/pending");
    fireEvent.click(await screen.findByRole("button", { name: "Detail Kredit Tanpa Agunan" }));
    const dialog = await screen.findByRole("dialog", { name: "Detail" });

    const version = await within(dialog).findByRole("row", { name: /^Version/ });
    const survey = within(dialog).getByRole("row", { name: /^Survey/ });
    const approval = within(dialog).getByRole("row", { name: /^Approval/ });

    expect(cellTexts(version)).toEqual(["2", "3"]);
    expect(cellTexts(survey)).toEqual(["On", "Off"]);
    expect(survey).toHaveAttribute("data-changed", "true");
    expect(approval).not.toHaveAttribute("data-changed");
    expect(within(dialog).queryByText(/versionId|Version Id/)).not.toBeInTheDocument();
  });
});
