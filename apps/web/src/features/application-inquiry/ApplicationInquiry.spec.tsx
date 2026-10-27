import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inquiryItem, inquiryPage, inquiryRoutes, LIST_KEY } from "../../test/application-inquiry";
import { renderApp, stubApi } from "../../test/render-app";
import { INQUIRY_REFRESH_MS } from "./api";

const listKey = (query: string) => `GET /api/v1/applications?page=1&${query}`;
const rowOf = (loanId: string) => {
  const row = screen.getByRole("link", { name: loanId }).closest("tr");
  if (!row) throw new Error(`No row for ${loanId}`);
  return row;
};

describe("Application Inquiry", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("AC-83.01 searches rudi and shows RUDI HARTONO with the masked NIK", async () => {
    const rudi = inquiryItem({ fullName: "RUDI HARTONO" });
    const fetch = stubApi(inquiryRoutes({ [listKey("q=rudi")]: inquiryPage([rudi]) }));
    renderApp("/applications");
    await screen.findByRole("heading", { name: "Application Inquiry" });

    fireEvent.change(await screen.findByLabelText("Search"), { target: { value: "rudi" } });

    expect(await screen.findByText("RUDI HARTONO")).toBeInTheDocument();
    expect(within(rowOf(rudi.loanId)).getByText("3273********0001")).toBeInTheDocument();
    expect(within(rowOf(rudi.loanId)).getByText("Approval")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/v1/applications?page=1&q=rudi", expect.anything());
  });

  it("AC-83.02 filters by the Approval step after Apply", async () => {
    const fetch = stubApi(inquiryRoutes({ [listKey("state=APPROVAL")]: inquiryPage([inquiryItem()]) }));
    renderApp("/applications");

    fireEvent.click(await screen.findByRole("button", { name: "Filter" }));
    fireEvent.change(screen.getByLabelText("State"), { target: { value: "APPROVAL" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/v1/applications?page=1&state=APPROVAL", expect.anything()),
    );
  });

  it("AC-83.03 sorts Modified Date newest first, then oldest first on the second click", async () => {
    const fetch = stubApi(
      inquiryRoutes({
        [listKey("sort=modifiedAt%2Cdesc")]: inquiryPage([inquiryItem()]),
        [listKey("sort=modifiedAt%2Casc")]: inquiryPage([inquiryItem()]),
      }),
    );
    renderApp("/applications");

    fireEvent.click(await screen.findByRole("button", { name: "Modified Date" }));
    await waitFor(() =>
      expect(screen.getByRole("columnheader", { name: "Modified Date" })).toHaveAttribute("aria-sort", "descending"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Modified Date" }));

    await waitFor(() =>
      expect(screen.getByRole("columnheader", { name: "Modified Date" })).toHaveAttribute("aria-sort", "ascending"),
    );
    expect(fetch).toHaveBeenCalledWith("/api/v1/applications?page=1&sort=modifiedAt%2Cdesc", expect.anything());
    expect(fetch).toHaveBeenCalledWith("/api/v1/applications?page=1&sort=modifiedAt%2Casc", expect.anything());
  });

  it("AC-83.04 shows No applications found for zzzz", async () => {
    stubApi(inquiryRoutes({ [listKey("q=zzzz")]: inquiryPage([]) }));
    renderApp("/applications");

    fireEvent.change(await screen.findByLabelText("Search"), { target: { value: "zzzz" } });

    expect(await screen.findByText("No applications found")).toBeInTheDocument();
  });

  it("AC-83.05 shows 41 items and 1 application on page 3", async () => {
    const last = inquiryItem({ loanId: "20102026KTA0000041" });
    stubApi(
      inquiryRoutes({
        [LIST_KEY]: inquiryPage([inquiryItem()], 1, 41),
        "GET /api/v1/applications?page=3": inquiryPage([last], 3, 41),
      }),
    );
    renderApp("/applications");

    expect(await screen.findByText("41 items")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));

    expect(await screen.findByRole("link", { name: last.loanId })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
  });

  it("AC-83.06 shows the next step within 30 seconds without reloading the page", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const routes = inquiryRoutes({ [LIST_KEY]: inquiryPage([inquiryItem({ state: "DEDUP" })]) });
    stubApi(routes);
    renderApp("/applications");
    expect(await screen.findByText("Dedup")).toBeInTheDocument();

    routes[LIST_KEY] = inquiryPage([inquiryItem({ state: "FRAUD" })]);
    await vi.advanceTimersByTimeAsync(INQUIRY_REFRESH_MS);

    expect(await screen.findByText("Fraud")).toBeInTheDocument();
  });

  it("AC-83.07 rejects a Submitted Date range that ends before it starts", async () => {
    const fetch = stubApi(inquiryRoutes());
    renderApp("/applications");

    fireEvent.click(await screen.findByRole("button", { name: "Filter" }));
    fireEvent.change(screen.getByLabelText("Submitted Date From"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("Submitted Date To"), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("End date must be on or after start date")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining("submittedFrom"), expect.anything());
  });
});
