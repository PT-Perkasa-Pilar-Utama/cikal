import { sessionResponseMock, standardErrors } from "@cikal/contracts";
import { createMemoryHistory } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { App, createApp } from "../app";

export interface StubResponse {
  status: number;
  body?: unknown;
}

/** Respons palsu per `"<METHOD> <path>"`; objeknya boleh diubah di tengah test untuk meniru perubahan state server. */
export type ApiRoutes = Record<string, StubResponse>;

export const sessionOk: StubResponse = { status: 200, body: sessionResponseMock };

/** Envelope error API-04 dengan pesan standar dari kontrak. */
export function standardError(code: keyof typeof standardErrors): StubResponse {
  const { status, message } = standardErrors[code];
  return { status, body: { code, message, details: [], correlationId: "c-1" } };
}

/** Mengganti `fetch` dengan tabel rute; request di luar tabel menggagalkan test. */
export function stubApi(routes: ApiRoutes) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const key = `${init?.method ?? "GET"} ${String(input)}`;
    const route = routes[key];
    if (!route) throw new Error(`Unexpected request ${key}`);
    const body = route.status === 204 ? null : JSON.stringify(route.body);
    return new Response(body, { status: route.status });
  });
}

/** Merender SPA utuh pada `path` dengan router memori. */
export function renderApp(path: string) {
  const app = createApp(createMemoryHistory({ initialEntries: [path] }));
  render(<App {...app} />);
  return app;
}
