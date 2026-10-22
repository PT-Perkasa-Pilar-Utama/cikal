import { changeRequestAcceptedMock, productDetailResponseMock, productListResponseMock } from "@cikal/contracts";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, sessionOk, stubApi } from "../../test/render-app";

const productId = productDetailResponseMock.data.id;

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Isi form "New Product" seperti AC-20.01; `overrides` mengganti nilai per label. */
async function fillNewProduct(overrides: Record<string, string> = {}) {
  await screen.findByRole("form", { name: "Product" });
  const values: Record<string, string> = {
    "Product Code": "KTA",
    "Product Name": "Kredit Tanpa Agunan",
    "Product Category": "NON_COLLATERAL",
    "Interest Type": "EFFECTIVE",
    "Minimal Plafond": "5.000.000",
    "Maximal Plafond": "300.000.000",
    "Minimum Tenor": "6",
    "Maximum Tenor": "60",
    "Minimum Age": "21",
    "Maximum Age": "55",
    "DBR Max": "40",
    "Limit Auto Approval": "10.000.000",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) fill(new RegExp(`^${label}`), value);
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }));

function postedBody(fetchSpy: ReturnType<typeof stubApi>, method: string): unknown {
  const call = fetchSpy.mock.calls.find(([, init]) => init?.method === method);
  return JSON.parse(String(call?.[1]?.body));
}

function productError(code: string, status: number, message: string): StubResponse {
  return { status, body: { code, message, details: [], correlationId: "c-1" } };
}

describe("New Product", () => {
  afterEach(() => vi.restoreAllMocks());

  it("submits a new product for approval and shows the message on Product (AC-20.01)", async () => {
    const fetchSpy = stubApi({
      "GET /api/v1/auth/session": sessionOk,
      "POST /api/v1/products": { status: 202, body: changeRequestAcceptedMock("PRODUCT", null) },
      "GET /api/v1/products?page=1": { status: 200, body: productListResponseMock },
    });
    renderApp("/master/products/new");
    await fillNewProduct();

    submit();

    expect(await screen.findByRole("heading", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Data submitted for approval");
    expect(postedBody(fetchSpy, "POST")).toMatchObject({
      productCode: "KTA",
      productCategory: "NON_COLLATERAL",
      interestType: "EFFECTIVE",
      minPlafond: "5000000.00",
      maxPlafond: "300000000.00",
      minTenor: 6,
      maxTenor: 60,
      dbrMax: "40.0000",
      limitAutoApproval: "10000000.00",
    });
  });

  const serverRefusals: {
    ac: string;
    overrides: Record<string, string>;
    code: string;
    status: number;
    message: string;
  }[] = [
    {
      ac: "AC-20.02",
      overrides: { "Minimal Plafond": "300.000.000", "Maximal Plafond": "5.000.000" },
      code: "INVALID_PLAFOND_RANGE",
      status: 422,
      message: "Maximal plafond must be greater than minimal plafond",
    },
    {
      ac: "AC-20.03",
      overrides: { "Product Code": "kta" },
      code: "PRODUCT_CODE_EXISTS",
      status: 409,
      message: "Product code already exists",
    },
    {
      ac: "AC-20.04",
      overrides: { "Product Code": "KPRSUB" },
      code: "INVALID_PRODUCT_CODE",
      status: 422,
      message: "Product code must be 1 to 5 letters or digits",
    },
    {
      ac: "AC-20.05",
      overrides: { "Limit Auto Approval": "300.000.001" },
      code: "AUTO_APPROVAL_LIMIT_EXCEEDED",
      status: 422,
      message: "Limit auto approval must not exceed maximal plafond",
    },
    {
      ac: "AC-20.07",
      overrides: { "Maximum Tenor": "36" },
      code: "TENOR_EXCEEDS_CORE_LIMIT",
      status: 422,
      message: "Maximum tenor must not exceed core banking limit (24 months)",
    },
  ];

  it.each(serverRefusals)("$ac shows the server message and stays on New Product", async (refusal) => {
    const { overrides, code, status, message } = refusal;
    stubApi({ "GET /api/v1/auth/session": sessionOk, "POST /api/v1/products": productError(code, status, message) });
    renderApp("/master/products/new");
    await fillNewProduct(overrides);

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("heading", { name: "New Product" })).toBeInTheDocument();
  });

  it("asks for the required fields without calling the API", async () => {
    const fetchSpy = stubApi({ "GET /api/v1/auth/session": sessionOk });
    renderApp("/master/products/new");
    await fillNewProduct({ "Product Name": "" });

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Please complete all required fields");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("asks for Contract Type only for a Syariah product", async () => {
    stubApi({ "GET /api/v1/auth/session": sessionOk });
    renderApp("/master/products/new");
    await fillNewProduct();
    expect(screen.queryByLabelText(/^Contract Type/)).not.toBeInTheDocument();

    fill(/^Product Category/, "SYARIAH");

    expect(screen.getByLabelText(/^Contract Type/)).toBeInTheDocument();
  });
});

describe("Edit Product", () => {
  afterEach(() => vi.restoreAllMocks());

  function editRoutes(): ApiRoutes {
    return {
      "GET /api/v1/auth/session": sessionOk,
      [`GET /api/v1/products/${productId}`]: { status: 200, body: productDetailResponseMock },
      [`PUT /api/v1/products/${productId}`]: { status: 202, body: changeRequestAcceptedMock("PRODUCT", productId) },
      "GET /api/v1/products?page=1": { status: 200, body: productListResponseMock },
    };
  }

  it("submits the edited product and keeps the fees the form does not show", async () => {
    const fetchSpy = stubApi(editRoutes());
    renderApp(`/master/products/${productId}`);
    await screen.findByDisplayValue("Kredit Tanpa Agunan");
    fill(/^Limit Auto Approval/, "15.000.000");

    submit();

    expect(await screen.findByRole("status")).toHaveTextContent("Data submitted for approval");
    expect(postedBody(fetchSpy, "PUT")).toMatchObject({
      productCode: "KTA",
      limitAutoApproval: "15000000.00",
      adminFee: "250000.00",
      provisionFee: "1.0000",
      isActive: true,
    });
  });

  it("does not let the product code change", async () => {
    stubApi(editRoutes());
    renderApp(`/master/products/${productId}`);

    expect(await screen.findByDisplayValue("KTA")).toHaveAttribute("readonly");
  });
});
