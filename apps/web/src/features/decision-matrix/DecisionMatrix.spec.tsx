import {
  type ChangeRequestListResponse,
  changeRequestAcceptedMock,
  changeRequestListResponseMock,
  type DecisionMatrixListResponse,
  decisionMatrixListResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { choose, goRow, LIST, notGoRow, sentBody, stubMatrix, UPDATE } from "../../test/decision-matrix";
import { renderApp, standardError } from "../../test/render-app";

describe("Decision Matrix", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists the matrix rows by priority with module outcome labels", async () => {
    stubMatrix();
    renderApp("/master/decision");

    const row = await screen.findByRole("row", { name: /Collect 2/ });

    expect(
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["5", "[ANY]", "[ANY]", "[ANY]", "[ANY]", "Pass", "Collect 2", "NotGo", "-", ""]);
  });

  it("AC-36.01 submits Go for SLIK Collect 2 and Scoring Pass and shows Data submitted for approval", async () => {
    const fetch = stubMatrix({
      [UPDATE]: { status: 202, body: changeRequestAcceptedMock("DECISION_MATRIX", notGoRow.id) },
    });
    renderApp("/master/decision");

    fireEvent.click(await screen.findByRole("button", { name: "Edit Priority 5" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Decision Matrix" });
    choose(dialog, { "Decision Outcome": "Go" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Data submitted for approval")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sentBody(fetch, UPDATE)).toEqual({
      dedupOutcome: "ANY",
      dukcapilOutcome: "ANY",
      fraudOutcome: "ANY",
      racOutcome: "ANY",
      scoringOutcome: "PASS",
      creditBureauOutcome: "COLLECT_2",
      decisionOutcome: "GO",
      priority: 5,
      description: null,
    });
  });

  it("AC-36.01 shows the submitted change in Pending Decision Matrix", async () => {
    const [item] = changeRequestListResponseMock.data;
    if (!item) throw new Error("change request mock has no item");
    const pending: ChangeRequestListResponse = {
      ...changeRequestListResponseMock,
      data: [
        {
          ...item,
          entityType: "DECISION_MATRIX",
          entityId: notGoRow.id,
          action: "UPDATE",
          displayName: "Priority 5: Scoring Pass, SLIK Collect 2 = Go",
        },
      ],
    };
    stubMatrix({ "GET /api/v1/change-requests?entityType=DECISION_MATRIX&page=1": { status: 200, body: pending } });
    renderApp("/master/decision");

    fireEvent.click(await screen.findByRole("link", { name: "Pending Decision Matrix" }));

    const row = await screen.findByRole("row", { name: /Priority 5: Scoring Pass, SLIK Collect 2 = Go/ });
    expect(row).toHaveTextContent("Decision Matrix");
    expect(row).toHaveTextContent("Waiting Approval");
  });

  it("shows the server message when the row already has a pending change", async () => {
    stubMatrix({ [UPDATE]: standardError("PENDING_CHANGE_REQUEST") });
    renderApp("/master/decision");
    fireEvent.click(await screen.findByRole("button", { name: "Edit Priority 5" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Decision Matrix" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This data has a pending submission and cannot be edited",
    );
  });

  it("hides the edit icon for a row waiting for approval and for a Maker without Update", async () => {
    const waiting: DecisionMatrixListResponse = {
      ...decisionMatrixListResponseMock,
      data: [goRow, { ...notGoRow, hasPendingChange: true }],
    };
    stubMatrix({ [LIST]: { status: 200, body: waiting } }, ["VIEW"]);
    renderApp("/master/decision");

    expect(await screen.findByRole("row", { name: /Collect 2/ })).toHaveTextContent("Waiting Approval");
    expect(screen.queryByRole("button", { name: /^Edit Priority/ })).not.toBeInTheDocument();
  });
});
