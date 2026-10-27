import {
  applicationApprovalResponseMock,
  applicationDocumentsResponseMock,
  fileDownloadUrlResponseMock,
  financingResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DETAIL_KEY, DETAIL_LOAN_ID, detailResponse, inquiryRoutes } from "../../test/application-inquiry";
import { renderApp, stubApi } from "../../test/render-app";

const APPLICATION_ID = detailResponse().body.data.id;
const KTP = applicationDocumentsResponseMock.data.slots[0]?.file;
const NOT_FOUND = {
  status: 404,
  body: { code: "APPLICATION_NOT_FOUND", message: "Application not found", details: [], correlationId: "c-1" },
};

/** Nilai satu pasangan label di ringkasan atau panel tab. */
const fieldValue = (container: HTMLElement, label: string) => within(container).getByText(label).nextElementSibling;

describe("Application Detail", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-84.01 opens the detail from the Loan ID with the summary and the Detail tab open", async () => {
    stubApi(inquiryRoutes());
    renderApp("/applications");

    fireEvent.click(await screen.findByRole("link", { name: DETAIL_LOAN_ID }));

    const summary = await screen.findByRole("region", { name: "Summary" });
    expect(fieldValue(summary, "Loan Number")).toHaveTextContent(DETAIL_LOAN_ID);
    expect(fieldValue(summary, "Application Type")).toHaveTextContent("NTB");
    expect(fieldValue(summary, "Loan Amount")).toHaveTextContent("20.000.000");
    expect(fieldValue(summary, "Tenor Approved")).toHaveTextContent("-");
    expect(screen.getByRole("tab", { name: "Detail" })).toHaveAttribute("aria-selected", "true");
    expect(fieldValue(screen.getByRole("tabpanel", { name: "Detail" }), "Tenor Proposed")).toHaveTextContent("36");
  });

  it("AC-84.01 shows the approved tenor once the application is approved", async () => {
    const approved = detailResponse({
      status: "APPROVED",
      summary: { ...detailResponse().body.data.summary, tenorApproved: 24, loanAmount: "18000000.00" },
    });
    stubApi(inquiryRoutes({ [DETAIL_KEY]: approved }));
    renderApp(`/applications/loan/${DETAIL_LOAN_ID}`);

    const summary = await screen.findByRole("region", { name: "Summary" });
    expect(fieldValue(summary, "Tenor Approved")).toHaveTextContent("24");
    expect(fieldValue(summary, "Loan Amount")).toHaveTextContent("18.000.000");
  });

  it("AC-84.02 downloads the KTP from the Document tab", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    stubApi(
      inquiryRoutes({
        [`GET /api/v1/applications/${APPLICATION_ID}/documents`]: {
          status: 200,
          body: applicationDocumentsResponseMock,
        },
        [`GET /api/v1/files/${KTP?.fileId}/download-url?disposition=attachment`]: {
          status: 200,
          body: fileDownloadUrlResponseMock,
        },
      }),
    );
    renderApp(`/applications/loan/${DETAIL_LOAN_ID}`);

    fireEvent.click(await screen.findByRole("tab", { name: "Document" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download KTP" }));

    await vi.waitFor(() => expect(open).toHaveBeenCalledWith(fileDownloadUrlResponseMock.data.url, "_self"));
  });

  it("AC-84.03 shows only the tabs the API returns, without Spouse, Business, LKN, and Collateral", async () => {
    stubApi(inquiryRoutes());
    renderApp(`/applications/loan/${DETAIL_LOAN_ID}`);

    const tabs = await screen.findAllByRole("tab");

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Detail",
      "Personal",
      "Occupation",
      "Document",
      "Emergency Contact",
      "Workflow",
      "Dedup",
      "Approval",
    ]);
    for (const hidden of ["Spouse", "Business", "LKN", "Collateral"]) {
      expect(screen.queryByRole("tab", { name: hidden })).not.toBeInTheDocument();
    }
  });

  it("AC-74.01 shows the financing with an installment schedule ending at 0 in the Approval tab", async () => {
    const autoApproved = detailResponse({
      status: "ON_PROGRESS",
      summary: { ...detailResponse().body.data.summary, tenorApproved: 36, loanAmount: "8000000.00" },
    });
    const approval = { ...applicationApprovalResponseMock.data, applicationId: APPLICATION_ID, chain: [] };
    stubApi(
      inquiryRoutes({
        [DETAIL_KEY]: autoApproved,
        [`GET /api/v1/applications/${APPLICATION_ID}/approval`]: { status: 200, body: { data: approval } },
        [`GET /api/v1/applications/${APPLICATION_ID}/financing`]: { status: 200, body: financingResponseMock },
      }),
    );
    renderApp(`/applications/loan/${DETAIL_LOAN_ID}`);

    fireEvent.click(await screen.findByRole("tab", { name: "Approval" }));

    const panel = await screen.findByRole("tabpanel", { name: "Approval" });
    for (const label of ["Plafond", "Tenor", "Interest Rate", "Installment"]) {
      expect(await within(panel).findByText(label)).toBeInTheDocument();
    }
    const rows = within(within(panel).getByRole("table", { name: "Installment Schedule" })).getAllByRole("row");
    expect(rows.at(-1)?.lastElementChild).toHaveTextContent(/^0$/);
  });

  it("AC-84.04 shows Application not found for an application of another company", async () => {
    const otherCompany = "07102026KTA0000001";
    stubApi(inquiryRoutes({ [`GET /api/v1/applications/by-loan-id/${otherCompany}`]: NOT_FOUND }));
    renderApp(`/applications/loan/${otherCompany}`);

    expect(await screen.findByText("Application not found")).toBeInTheDocument();
  });

  it("AC-84.05 shows Application not found for the Loan ID TIDAKADA", async () => {
    stubApi(inquiryRoutes({ "GET /api/v1/applications/by-loan-id/TIDAKADA": NOT_FOUND }));
    renderApp("/applications/loan/TIDAKADA");

    expect(await screen.findByText("Application not found")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
