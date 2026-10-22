import { changeRequestAcceptedMock, productDetailResponseMock, productPricingResponseMock } from "@cikal/contracts";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, sessionOk, stubApi } from "../../test/render-app";

const productId = productDetailResponseMock.data.id;
const pricingPath = `/api/v1/products/${productId}/pricing`;

/** Produk KTA tanpa periode pricing, sehingga tab mulai dengan satu baris kosong. */
const emptyPricing = {
  status: 200,
  body: { data: { ...productPricingResponseMock.data, adminFee: "0.00", provisionFee: "0.0000", subProducts: [] } },
};

function pricingRoutes(put: StubResponse): ApiRoutes {
  return {
    "GET /api/v1/auth/session": sessionOk,
    [`GET /api/v1/products/${productId}`]: { status: 200, body: productDetailResponseMock },
    [`GET ${pricingPath}`]: emptyPricing,
    [`PUT ${pricingPath}`]: put,
  };
}

function fillCell(label: string, row: number, value: string) {
  fireEvent.change(screen.getByLabelText(`${label} row ${row}`), { target: { value } });
}

/** Satu baris periode: suku bunga, rentang Approver, dan tanggal berlaku. */
function fillPeriod(row: number, rate: string, min: string, max: string, from: string, to = "") {
  fillCell("Interest Rate (% p.a.)", row, rate);
  fillCell("Approver Rate Min (%)", row, min);
  fillCell("Approver Rate Max (%)", row, max);
  fillCell("Valid From", row, from);
  fillCell("Valid To", row, to);
}

async function openPricingTab() {
  renderApp(`/master/products/${productId}`);
  fireEvent.click(await screen.findByRole("link", { name: "Pricing" }));
  await screen.findByRole("form", { name: "Pricing" });
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }));

describe("Pricing tab", () => {
  afterEach(() => vi.restoreAllMocks());

  it("submits two interest rate periods with fees for approval (AC-97.01)", async () => {
    const fetchSpy = stubApi(
      pricingRoutes({ status: 202, body: changeRequestAcceptedMock("PRODUCT_PRICING", productId) }),
    );
    await openPricingTab();
    fillPeriod(1, "12", "11", "15", "2026-10-01", "2026-12-31");
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
    fillPeriod(2, "14", "11", "15", "2027-01-01");
    fireEvent.change(screen.getByLabelText(/^Provision Fee \(%\)/), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/^Admin Fee/), { target: { value: "250.000" } });

    submit();

    expect(await screen.findByRole("status")).toHaveTextContent("Data submitted for approval");
    const call = fetchSpy.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      adminFee: "250000.00",
      provisionFee: "1.0000",
      subProducts: [
        {
          interestRate: "12.0000",
          approverRateMin: "11.0000",
          approverRateMax: "15.0000",
          validFrom: "2026-10-01",
          validTo: "2026-12-31",
        },
        { interestRate: "14.0000", approverRateMin: "11.0000", approverRateMax: "15.0000", validFrom: "2027-01-01" },
      ],
    });
  });

  it.each([
    {
      ac: "AC-97.02",
      periods: [
        ["12", "11", "15", "2026-10-01", "2026-12-31"],
        ["14", "11", "15", "2026-12-15"],
      ],
      error: { code: "PRICING_PERIOD_OVERLAP", message: "Pricing periods must not overlap" },
    },
    {
      ac: "AC-97.03",
      periods: [["14", "10", "13", "2026-10-01"]],
      error: { code: "INVALID_APPROVER_RATE_RANGE", message: "Approver rate range must include the interest rate" },
    },
  ])("$ac shows the server message on the Pricing tab", async ({ periods, error }) => {
    stubApi(pricingRoutes({ status: 422, body: { ...error, details: [], correlationId: "c-1" } }));
    await openPricingTab();
    periods.forEach(([rate = "", min = "", max = "", from = "", to], index) => {
      if (index > 0) fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
      fillPeriod(index + 1, rate, min, max, from, to);
    });
    fireEvent.change(screen.getByLabelText(/^Provision Fee \(%\)/), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/^Admin Fee/), { target: { value: "250.000" } });

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(error.message);
  });

  it("loads the active periods with rates and fees in screen format", async () => {
    stubApi({
      ...pricingRoutes({ status: 500 }),
      [`GET ${pricingPath}`]: { status: 200, body: productPricingResponseMock },
    });
    await openPricingTab();

    expect(screen.getByLabelText("Interest Rate (% p.a.) row 2")).toHaveValue("14");
    expect(screen.getByLabelText("Valid To row 1")).toHaveValue("2026-12-31");
    expect(screen.getByLabelText(/^Admin Fee/)).toHaveValue("250.000");
  });

  it("asks for the required fields without calling the API", async () => {
    const fetchSpy = stubApi(pricingRoutes({ status: 500 }));
    await openPricingTab();

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Please complete all required fields");
    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });
});
