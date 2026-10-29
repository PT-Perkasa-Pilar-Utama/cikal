import {
  type DocumentNumberFormatListResponse,
  documentNumberFormatAcceptedMock,
  documentNumberFormatListResponseMock,
  documentNumberPreviewResponseMock,
  type SessionResponse,
  sessionResponseMock,
  standardErrors,
} from "@cikal/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, standardError, stubApi } from "../../test/render-app";

const LIST_KEY = "GET /api/v1/document-number-formats";
const PREVIEW_KEY = "POST /api/v1/document-number-formats/preview";
const UPDATE_KEY = "PUT /api/v1/document-number-formats/SP3K";
const NEW_PATTERN = "SP3K-{BRANCH_CODE}-{YYYY}{MM}-{SEQ:5}";

/** Sesi Maker dengan Document Number Format View dan Update (api-specs 01 §1.11). */
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
              menuCode: "MST-NUMBERING",
              menuName: "Document Number Format",
              link: "/master/numbering",
              iconName: "hash",
              actions: ["VIEW", "UPDATE"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

const patternError = (code: string, message: string): StubResponse => ({
  status: 422,
  body: { code, message, details: [], correlationId: "c-1" },
});

function renderNumbering(extra: ApiRoutes = {}) {
  const routes: ApiRoutes = {
    "GET /api/v1/auth/session": makerSession,
    [LIST_KEY]: { status: 200, body: documentNumberFormatListResponseMock },
    [PREVIEW_KEY]: { status: 200, body: documentNumberPreviewResponseMock },
    ...extra,
  };
  const fetch = stubApi(routes);
  renderApp("/master/numbering");
  return { fetch, routes };
}

const bodiesOf = (fetch: ReturnType<typeof stubApi>, key: string): unknown[] =>
  fetch.mock.calls
    .filter(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key)
    .map(([, init]) => JSON.parse(String(init?.body)));

async function editSp3k(pattern: string) {
  fireEvent.click(await screen.findByRole("button", { name: "Edit SP3K" }));
  const dialog = await screen.findByRole("dialog", { name: "Edit Document Numbering" });
  fireEvent.change(within(dialog).getByLabelText(/^Pattern/), { target: { value: pattern } });
  return dialog;
}

describe("Document Numbering", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists the active SP3K and Contract formats from the Document Number Format menu", async () => {
    stubApi({
      "GET /api/v1/auth/session": makerSession,
      [LIST_KEY]: { status: 200, body: documentNumberFormatListResponseMock },
    });
    renderApp("/");
    const menu = await screen.findByRole("navigation", { name: "Main menu" });
    fireEvent.click(within(menu).getByRole("link", { name: "Document Number Format" }));

    await screen.findByText("{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}");
    const table = screen.getByRole("table", { name: "Document Numbering" });
    const sp3k = within(table).getByText("{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}").closest("tr");
    expect(sp3k).toHaveTextContent("Monthly");
    expect(sp3k).toHaveTextContent("Branch");
    expect(within(table).getByText("{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}").closest("tr")).toHaveTextContent("Yearly");
  });

  it("AC-102.01 shows the live preview and submits the new SP3K format for approval", async () => {
    const { fetch } = renderNumbering({
      [UPDATE_KEY]: {
        status: 202,
        body: { ...documentNumberFormatAcceptedMock, message: "Data submitted for approval" },
      },
    });

    const dialog = await editSp3k(NEW_PATTERN);
    fireEvent.change(within(dialog).getByLabelText(/^Reset Period/), { target: { value: "MONTHLY" } });
    fireEvent.change(within(dialog).getByLabelText(/^Counter Scope/), { target: { value: "BRANCH" } });
    await waitFor(() =>
      expect(bodiesOf(fetch, PREVIEW_KEY)).toContainEqual({
        documentType: "SP3K",
        pattern: NEW_PATTERN,
        resetPeriod: "MONTHLY",
        counterScope: "BRANCH",
      }),
    );
    expect(await within(dialog).findByText("SP3K-011-202610-00001")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Data submitted for approval")).toBeInTheDocument();
    expect(screen.getByText("SP3K-011-202610-00001")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(bodiesOf(fetch, UPDATE_KEY)).toEqual([
      { pattern: NEW_PATTERN, resetPeriod: "MONTHLY", counterScope: "BRANCH" },
    ]);
  });

  it("AC-102.04 shows the sequence token message for a pattern without {SEQ:n}", async () => {
    const message = "Pattern must contain exactly one sequence token {SEQ:n} with n between 3 and 9";
    renderNumbering({
      [PREVIEW_KEY]: patternError("INVALID_SEQUENCE_TOKEN", message),
      [UPDATE_KEY]: patternError("INVALID_SEQUENCE_TOKEN", message),
    });

    const dialog = await editSp3k("SP3K/{BRANCH_CODE}/{YYYY}");
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /^Pattern/ })).toHaveAttribute("aria-invalid", "true");
  });

  it("AC-102.05 shows Unknown token: BRANCH_NAME", async () => {
    renderNumbering({
      [PREVIEW_KEY]: patternError("UNKNOWN_TOKEN", "Unknown token: BRANCH_NAME"),
      [UPDATE_KEY]: patternError("UNKNOWN_TOKEN", "Unknown token: BRANCH_NAME"),
    });

    const dialog = await editSp3k("{SEQ:4}/SP3K/{BRANCH_NAME}");
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(await within(dialog).findByText("Unknown token: BRANCH_NAME")).toBeInTheDocument();
  });

  it("shows Waiting Approval and no edit for a format with a pending change", async () => {
    const list: DocumentNumberFormatListResponse = {
      data: documentNumberFormatListResponseMock.data.map((format) => ({
        ...format,
        hasPendingChange: format.documentType === "SP3K",
      })),
    };
    renderNumbering({ [LIST_KEY]: { status: 200, body: list } });

    const row = (await screen.findByText("{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}")).closest("tr");
    expect(row).toHaveTextContent("Waiting Approval");
    expect(screen.getByRole("button", { name: "Edit SP3K" })).toBeDisabled();
  });

  it("shows the server message when another change is still waiting for approval", async () => {
    renderNumbering({
      [UPDATE_KEY]: standardError("PENDING_CHANGE_REQUEST"),
    });

    const dialog = await editSp3k(NEW_PATTERN);
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(await within(dialog).findByText(standardErrors.PENDING_CHANGE_REQUEST.message)).toBeInTheDocument();
  });
});
