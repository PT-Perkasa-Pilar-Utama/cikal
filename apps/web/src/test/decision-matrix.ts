import {
  type Action,
  decisionMatrixListResponseMock,
  type SessionResponse,
  sessionResponseMock,
} from "@cikal/contracts";
import { fireEvent, within } from "@testing-library/react";
import { type ApiRoutes, stubApi } from "./render-app";

function mockRows() {
  const [goRow, notGoRow] = decisionMatrixListResponseMock.data;
  if (!goRow || !notGoRow) throw new Error("decision matrix mock needs two rows");
  return { goRow, notGoRow };
}

/** Baris Go prioritas 4 (AC-69.01) dan baris NotGo prioritas 5 SLIK Collect 2 dengan Scoring Pass (AC-36.01). */
export const { goRow, notGoRow } = mockRows();

export const LIST = "GET /api/v1/decision-matrix?page=1";
export const UPDATE = `PUT /api/v1/decision-matrix/rows/${notGoRow.id}`;
export const SIMULATE = "POST /api/v1/decision-matrix/simulate";

/** Sesi Maker: menu Decision Matrix dengan hak `actions` (api-specs 01 §1.11). */
function makerSession(actions: Action[]): SessionResponse {
  return {
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
              menuCode: "MST-DECISION",
              menuName: "Decision Matrix",
              link: "/master/decision",
              iconName: "git-branch",
              actions,
              children: [],
            },
          ],
        },
      ],
    },
  };
}

/** Sesi Maker dan daftar Decision Matrix contoh, ditambah rute `extra`. */
export function stubMatrix(extra: ApiRoutes = {}, actions: Action[] = ["VIEW", "CREATE", "UPDATE"]) {
  return stubApi({
    "GET /api/v1/auth/session": { status: 200, body: makerSession(actions) },
    [LIST]: { status: 200, body: decisionMatrixListResponseMock },
    ...extra,
  });
}

/** Body JSON request `key` yang dikirim ke `fetch` palsu. */
export function sentBody(fetch: ReturnType<typeof stubApi>, key: string): unknown {
  const call = fetch.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

/** Memilih opsi dropdown menurut labelnya, contoh `{ "Decision Outcome": "Go" }`. */
export function choose(dialog: HTMLElement, choices: Record<string, string>) {
  for (const [label, option] of Object.entries(choices)) {
    const select = within(dialog).getByRole("combobox", { name: label });
    const value = within(select).getByRole("option", { name: option }).getAttribute("value");
    fireEvent.change(select, { target: { value } });
  }
}
