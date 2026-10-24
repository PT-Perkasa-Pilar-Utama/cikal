import { installmentSimulationResponseMock, type SessionResponse, sessionResponseMock } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, stubApi } from "../../test/render-app";

const PATH = "/applications/simulation";
const POST = "POST /api/v1/calculations/installment-simulation";

/** Sesi Sales dengan hak View menu Installment Simulation. */
const salesSession: StubResponse = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      menus: [
        {
          menuCode: "APP",
          menuName: "Application",
          link: null,
          iconName: "file-stack",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "APP-SIMULATION",
              menuName: "Installment Simulation",
              link: "/applications/simulation",
              iconName: "calculator",
              actions: ["VIEW"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

const routes = (simulate: StubResponse): ApiRoutes => ({ "GET /api/v1/auth/session": salesSession, [POST]: simulate });

async function fill(values: Partial<Record<string, string>>) {
  await screen.findByRole("form", { name: "Installment Simulation" });
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(new RegExp(`^${label.replace(/[()%.]/g, "\\$&")}\\*?$`)), {
      target: { value },
    });
  }
}

const calculate = () => fireEvent.click(screen.getByRole("button", { name: "Calculate" }));

function postedBody(fetchSpy: ReturnType<typeof stubApi>): unknown {
  const call = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST");
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

describe("Installment Simulation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-51.01 sends the effective simulation and shows the installment with the schedule", async () => {
    const fetchSpy = stubApi(routes({ status: 200, body: installmentSimulationResponseMock }));
    renderApp(PATH);
    await fill({
      Principal: "100.000.000",
      "Tenor (months)": "12",
      "Interest Rate (% p.a.)": "12",
      "Interest Type": "EFFECTIVE",
    });

    calculate();

    const table = await screen.findByRole("table", { name: "Installment Schedule" });
    expect(screen.getByText("Rp8.884.879")).toBeInTheDocument();
    const lastRow = within(table).getAllByRole("row").at(-1);
    expect(lastRow).toHaveTextContent("8.796.907");
    expect(lastRow?.lastElementChild).toHaveTextContent(/^0$/);
    expect(postedBody(fetchSpy)).toEqual({
      interestType: "EFFECTIVE",
      principal: "100000000.00",
      tenor: 12,
      interestRate: "12.0000",
    });
  });

  it("AC-51.03 shows Tenor is required without calling the API", async () => {
    const fetchSpy = stubApi(routes({ status: 200, body: installmentSimulationResponseMock }));
    renderApp(PATH);
    await fill({ Principal: "100.000.000", "Interest Rate (% p.a.)": "12", "Interest Type": "FLAT" });

    calculate();

    expect(await screen.findByText("Tenor is required")).toBeInTheDocument();
    expect(postedBody(fetchSpy)).toBeUndefined();
  });

  it("AC-51.03 shows the server field message when the API rejects the tenor", async () => {
    stubApi(
      routes({
        status: 400,
        body: {
          code: "VALIDATION_FAILED",
          message: "Please complete all required fields",
          details: [{ field: "tenor", code: "invalid_type", message: "Tenor is required" }],
          correlationId: "c-1",
        },
      }),
    );
    renderApp(PATH);
    await fill({
      Principal: "100.000.000",
      "Tenor (months)": "12",
      "Interest Rate (% p.a.)": "12",
      "Interest Type": "FLAT",
    });

    calculate();

    expect(await screen.findByText("Tenor is required")).toBeInTheDocument();
  });

  it("asks for every field before sending", async () => {
    const fetchSpy = stubApi(routes({ status: 200, body: installmentSimulationResponseMock }));
    renderApp(PATH);
    await screen.findByRole("form", { name: "Installment Simulation" });

    calculate();

    expect(await screen.findAllByText("This field is required")).toHaveLength(3);
    expect(postedBody(fetchSpy)).toBeUndefined();
  });
});
