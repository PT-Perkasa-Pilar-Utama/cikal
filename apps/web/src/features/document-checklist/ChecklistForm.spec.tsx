import {
  changeRequestAcceptedMock,
  DOCUMENT_CHECKLIST_MESSAGES,
  documentChecklistListResponseMock,
  occupationOptionsResponseMock,
  productListResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, sessionOk, stubApi } from "../../test/render-app";

const [kta] = productListResponseMock.data;
const maritals = { data: [{ paramId: "002", paramValue: "Kawin", isActive: true }] };
const documents = {
  data: [
    { paramId: "KTP", paramValue: "KTP", isActive: true },
    { paramId: "NPWP", paramValue: "NPWP", isActive: true },
    { paramId: "BPJS", paramValue: "BPJS", isActive: true },
  ],
};

function routes(submit: ApiRoutes[string]): ApiRoutes {
  return {
    "GET /api/v1/auth/session": sessionOk,
    "GET /api/v1/products?page=1&pageSize=100": { status: 200, body: productListResponseMock },
    "GET /api/v1/parameters/Occupation/options": { status: 200, body: occupationOptionsResponseMock },
    "GET /api/v1/parameters/Marital/options": { status: 200, body: maritals },
    "GET /api/v1/parameters/Document/options": { status: 200, body: documents },
    "POST /api/v1/document-checklists": submit,
    "GET /api/v1/document-checklists?page=1": { status: 200, body: documentChecklistListResponseMock },
  };
}

const rejected = (status: number, code: string, message: string) => ({
  status,
  body: { code, message, details: [], correlationId: "c-1" },
});

async function choose(label: string, option: string) {
  fireEvent.change(await screen.findByLabelText(new RegExp(`^${label}\\*?$`)), {
    target: { value: screen.getByRole("option", { name: option }).getAttribute("value") },
  });
}

/** Pilih Product, Occupation "Karyawan Swasta", Marital "Kawin", lalu centang `checked`. */
async function fillForm(checked: string[]) {
  await screen.findByRole("form", { name: "Document Checklist" });
  await choose("Product", kta?.productName ?? "");
  await choose("Occupation", "Karyawan Swasta");
  await choose("Marital", "Kawin");
  for (const name of checked) fireEvent.click(screen.getByRole("checkbox", { name }));
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }));

function postedBody(fetchSpy: ReturnType<typeof stubApi>): unknown {
  const call = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST");
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

describe("New Document Checklist", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-25.01 submits the checked documents and shows the message on Document Checklist", async () => {
    const fetchSpy = stubApi(routes({ status: 202, body: changeRequestAcceptedMock("DOCUMENT_CHECKLIST", null) }));
    renderApp("/master/checklists/new");
    await fillForm(["KTP", "BPJS"]);
    fireEvent.click(screen.getByRole("switch", { name: "Mandatory BPJS" }));

    submit();

    expect(await screen.findByRole("heading", { name: "Document Checklist" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Data submitted for approval");
    expect(postedBody(fetchSpy)).toEqual({
      productId: kta?.id,
      occupation: "001",
      marital: "002",
      items: [
        { documentType: "KTP", isMandatory: true },
        { documentType: "BPJS", isMandatory: false },
      ],
    });
  });

  it("AC-25.02 shows the server message when no document is checked", async () => {
    const message = DOCUMENT_CHECKLIST_MESSAGES.noDocumentSelected;
    const fetchSpy = stubApi(routes(rejected(422, "NO_DOCUMENT_SELECTED", message)));
    renderApp("/master/checklists/new");
    await fillForm([]);

    submit();

    expect(await screen.findByText("Select at least one document")).toBeInTheDocument();
    expect(postedBody(fetchSpy)).toMatchObject({ items: [] });
  });

  it("AC-25.03 shows the server message when the combination already exists", async () => {
    stubApi(routes(rejected(409, "CHECKLIST_EXISTS", DOCUMENT_CHECKLIST_MESSAGES.checklistExists)));
    renderApp("/master/checklists/new");
    await fillForm(["KTP"]);

    submit();

    expect(await screen.findByText("Document checklist already exists for this combination")).toBeInTheDocument();
  });

  it("asks for Product, Occupation, and Marital before sending", async () => {
    const fetchSpy = stubApi(routes({ status: 202, body: changeRequestAcceptedMock("DOCUMENT_CHECKLIST", null) }));
    renderApp("/master/checklists/new");
    await screen.findByRole("form", { name: "Document Checklist" });

    submit();

    expect(await screen.findByText("Please complete all required fields")).toBeInTheDocument();
    expect(postedBody(fetchSpy)).toBeUndefined();
  });
});
