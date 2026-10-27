import {
  standardErrors,
  VERIFICATION_MESSAGES,
  verificationSaveResponseMock,
  verificationSubmitResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DOCUMENT_TYPES,
  documentsWith,
  ownTask,
  TASKS_KEY,
  taskPage,
  VERIFICATION_KEY,
  VERIFICATION_PATH,
  verificationOf,
  verificationRoutes,
} from "../../test/document-verification";
import { type ApiRoutes, renderApp, standardError, stubApi } from "../../test/render-app";

const SAVE_KEY = `PUT ${VERIFICATION_KEY}`;
const SUBMIT_KEY = `POST ${VERIFICATION_KEY}/submit`;
const allMatch = DOCUMENT_TYPES.map((documentType) => ({ documentType, verificationStatus: "MATCH", remarks: null }));

/** Baris dokumen di "Verification Detail" menurut labelnya. */
async function documentItem(label: string) {
  const group = await screen.findByRole("group", { name: label });
  const item = group.closest("li");
  if (!item) throw new Error(`No document row for ${label}`);
  return item;
}

async function choose(label: string, status: "Match" | "Not Match") {
  fireEvent.click(within(await documentItem(label)).getByRole("radio", { name: status }));
}

async function chooseAll(status: "Match" | "Not Match") {
  for (const group of await screen.findAllByRole("group")) {
    fireEvent.click(within(group).getByRole("radio", { name: status }));
  }
}

function requestOf(fetch: ReturnType<typeof stubApi>, key: string) {
  const call = fetch.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key);
  return { body: call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined, headers: call?.[1]?.headers };
}

function renderDetail(extra: ApiRoutes = {}) {
  const fetch = stubApi(verificationRoutes(extra));
  renderApp(VERIFICATION_PATH);
  return fetch;
}

describe("Document verification", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-64.01 opens the Verification Detail from Proceed to Verification", async () => {
    stubApi(verificationRoutes({ [TASKS_KEY]: { status: 200, body: taskPage([ownTask]) } }));
    renderApp("/operations/verification");

    expect(await screen.findByRole("heading", { name: "Verification Document" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Proceed to Verification" }));

    expect(await screen.findByRole("heading", { name: "Verification Detail" })).toBeInTheDocument();
    expect(await screen.findByText("20102026KTA0000013")).toBeInTheDocument();
    expect(screen.getByText("Rudi Hartono")).toBeInTheDocument();
    expect(screen.getAllByRole("group")).toHaveLength(7);
  });

  it("AC-64.01 submits seven Match documents and returns to the queue with Verification submitted", async () => {
    const allMatchResult = { result: "ALL_MATCH", nextStep: "APPROVAL", applicationStatus: "ON_PROGRESS" };
    const fetch = renderDetail({
      [SUBMIT_KEY]: { status: 200, body: { ...verificationSubmitResponseMock, data: allMatchResult } },
      [TASKS_KEY]: { status: 200, body: taskPage([]) },
    });

    await chooseAll("Match");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Verification submitted")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verification Document" })).toBeInTheDocument();
    const request = requestOf(fetch, SUBMIT_KEY);
    expect(request.body).toEqual({ documents: allMatch });
    expect(request.headers).toHaveProperty("Idempotency-Key");
  });

  it("AC-64.02 sends the NPWP Not Match remarks with the other documents Match", async () => {
    const fetch = renderDetail({
      [SUBMIT_KEY]: { status: 200, body: verificationSubmitResponseMock },
      [TASKS_KEY]: { status: 200, body: taskPage([]) },
    });

    await chooseAll("Match");
    await choose("NPWP", "Not Match");
    fireEvent.change(within(await documentItem("NPWP")).getByLabelText(/Remarks/), {
      target: { value: "Nama di NPWP tidak sesuai KTP" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Verification submitted")).toBeInTheDocument();
    expect(requestOf(fetch, SUBMIT_KEY).body).toEqual({
      documents: allMatch.map((document) =>
        document.documentType === "NPWP"
          ? { documentType: "NPWP", verificationStatus: "NOT_MATCH", remarks: "Nama di NPWP tidak sesuai KTP" }
          : document,
      ),
    });
  });

  it("AC-64.03 shows Remarks are required for Not Match documents under the NPWP remarks", async () => {
    const message = VERIFICATION_MESSAGES.remarksRequired;
    renderDetail({
      [SUBMIT_KEY]: {
        status: 422,
        body: {
          code: "REMARKS_REQUIRED",
          message,
          details: [{ field: "documents.NPWP.remarks", code: "REMARKS_REQUIRED", message }],
          correlationId: "c-1",
        },
      },
    });

    await chooseAll("Match");
    await choose("NPWP", "Not Match");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(within(await documentItem("NPWP")).getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verification Detail" })).toBeInTheDocument();
  });

  it("AC-64.04 saves 4 of 7 statuses and shows Verification saved", async () => {
    const fetch = renderDetail({ [SAVE_KEY]: { status: 200, body: verificationSaveResponseMock } });

    for (const label of ["KTP", "Kartu Keluarga", "NPWP", "Slip Gaji"]) await choose(label, "Match");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Verification saved")).toBeInTheDocument();
    const statuses = requestOf(fetch, SAVE_KEY).body.documents.map(
      (document: { verificationStatus: string }) => document.verificationStatus,
    );
    expect(statuses.filter((status: string) => status === "MATCH")).toHaveLength(4);
    expect(statuses.filter((status: string) => status === "PENDING")).toHaveLength(3);
  });

  it("AC-64.04 shows the saved statuses when the detail is opened again", async () => {
    renderDetail({
      [`GET ${VERIFICATION_KEY}`]: verificationOf({
        documents: documentsWith({
          KTP: { verificationStatus: "MATCH" },
          KK: { verificationStatus: "NOT_MATCH", remarks: "KK buram" },
        }),
      }),
    });

    expect(within(await documentItem("KTP")).getByRole("radio", { name: "Match" })).toBeChecked();
    expect(within(await documentItem("Kartu Keluarga")).getByRole("radio", { name: "Not Match" })).toBeChecked();
    expect(within(await documentItem("Kartu Keluarga")).getByLabelText(/Remarks/)).toHaveValue("KK buram");
  });

  it("AC-64.05 shows the KTP preview beside the document list when its name is clicked", async () => {
    renderDetail();

    fireEvent.click(within(await documentItem("KTP")).getByRole("button", { name: "KTP" }));

    const preview = await screen.findByTitle("Preview KTP");
    expect(preview).toHaveAttribute("src", expect.stringContaining("X-Amz-Signature"));
    expect(screen.getByRole("region", { name: "Document preview" })).toHaveTextContent("KTP");
  });

  it("shows the documents read only to a user who does not own the task", async () => {
    renderDetail({ [`GET ${VERIFICATION_KEY}`]: verificationOf({ editable: false }) });

    expect(within(await documentItem("KTP")).getByRole("radio", { name: "Match" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("shows the server message when the verification is no longer waiting", async () => {
    renderDetail({
      [`GET ${VERIFICATION_KEY}`]: standardError("INVALID_STATE"),
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(standardErrors.INVALID_STATE.message);
  });

  it("keeps Submit errors such as Please verify all documents on the detail", async () => {
    renderDetail({
      [SUBMIT_KEY]: {
        status: 422,
        body: {
          code: "VERIFICATION_INCOMPLETE",
          message: VERIFICATION_MESSAGES.incomplete,
          details: [],
          correlationId: "c-1",
        },
      },
    });

    await choose("KTP", "Match");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(VERIFICATION_MESSAGES.incomplete));
  });
});
