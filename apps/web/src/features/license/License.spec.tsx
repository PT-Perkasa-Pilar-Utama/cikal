import {
  type LicenseResponse,
  licenseInstallResponseMock,
  licenseResponseMock,
  type SessionResponse,
  sessionResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, type StubResponse, stubApi } from "../../test/render-app";

const GET_LICENSE = "GET /api/v1/license";
const INSTALL_LICENSE = "POST /api/v1/license";

/** Sesi Super User dengan License View, Create, dan Update (technical-specs 09 §9.5). */
const superUserSession = (actions: SessionResponse["data"]["menus"][number]["actions"]): StubResponse => ({
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      menus: [
        {
          menuCode: "SYS",
          menuName: "System",
          link: null,
          iconName: "settings",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "SYS-LICENSE",
              menuName: "License",
              link: "/system/license",
              iconName: "badge-check",
              actions,
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
});

/** Lisensi company 001 contoh AC-100.01: CORE, M06 s.d. M11, M14, M15, berlaku s.d. 31-12-2027. */
const activeLicense: LicenseResponse = {
  data: {
    ...licenseResponseMock.data,
    licenseNumber: "PPU-LIC-2026-0001",
    validFrom: "2026-10-21",
    validTo: "2027-12-31",
    modules: [
      { moduleCode: "CORE", moduleName: "Core" },
      { moduleCode: "M06", moduleName: "Dedup" },
      { moduleCode: "M07", moduleName: "Dukcapil" },
      { moduleCode: "M08", moduleName: "Fraud" },
      { moduleCode: "M09", moduleName: "RAC & Scoring" },
      { moduleCode: "M10", moduleName: "SLIK" },
      { moduleCode: "M11", moduleName: "Decision" },
      { moduleCode: "M14", moduleName: "E-Polis" },
      { moduleCode: "M15", moduleName: "Disbursement" },
    ],
  },
};

const licenseError = (status: number, code: string, message: string): StubResponse => ({
  status,
  body: { code, message, details: [], correlationId: "c-1" },
});

const licenseFile = (name = "license.json") =>
  new File(['{"license":{},"signature":"AA=="}'], name, { type: "application/json" });

function renderLicense(
  extra: ApiRoutes = {},
  actions: SessionResponse["data"]["menus"][number]["actions"] = ["VIEW", "CREATE", "UPDATE"],
) {
  const routes: ApiRoutes = {
    "GET /api/v1/auth/session": superUserSession(actions),
    [GET_LICENSE]: { status: 200, body: activeLicense },
    ...extra,
  };
  const fetch = stubApi(routes);
  renderApp("/system/license");
  return { fetch, routes };
}

function chooseLicenseFile(file: File) {
  fireEvent.change(screen.getByLabelText("License file"), { target: { files: [file] } });
}

const details = async () => within(await screen.findByRole("region", { name: "License details" }));
const findDetail = async (text: string) => (await details()).findByText(text);

describe("License", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AC-100.01 shows the licensed modules and the validity of the active license", async () => {
    renderLicense();

    expect(await screen.findByRole("heading", { name: "License" })).toBeInTheDocument();
    expect(await findDetail("PPU-LIC-2026-0001")).toBeInTheDocument();
    expect((await details()).getByText("21-10-2026")).toBeInTheDocument();
    expect((await details()).getByText("31-12-2027")).toBeInTheDocument();
    expect((await details()).getByText("Active")).toBeInTheDocument();
    const modules = within(screen.getByRole("table", { name: "Licensed modules" }));
    expect(modules.getAllByRole("row")).toHaveLength(10);
    expect(modules.getByRole("row", { name: "M10 SLIK" })).toBeInTheDocument();
    expect(modules.getByRole("row", { name: "M14 E-Polis" })).toBeInTheDocument();
  });

  it("AC-100.01 opens the License page from the System menu", async () => {
    stubApi({
      "GET /api/v1/auth/session": superUserSession(["VIEW"]),
      [GET_LICENSE]: { status: 200, body: activeLicense },
    });
    renderApp("/");

    fireEvent.click(await screen.findByRole("link", { name: "License" }));

    expect(await screen.findByRole("heading", { name: "License" })).toBeInTheDocument();
  });

  it("AC-100.01 installs a license file and shows License installed with the new license", async () => {
    const { fetch, routes } = renderLicense({ [INSTALL_LICENSE]: { status: 200, body: licenseInstallResponseMock } });
    await findDetail("PPU-LIC-2026-0001");
    routes[GET_LICENSE] = {
      status: 200,
      body: { data: { ...activeLicense.data, licenseNumber: "PPU-LIC-2026-0002" } } satisfies LicenseResponse,
    };

    chooseLicenseFile(licenseFile());

    expect(await screen.findByText("License installed")).toBeInTheDocument();
    expect(await findDetail("PPU-LIC-2026-0002")).toBeInTheDocument();
    const install = fetch.mock.calls.find(([input, init]) => `${init?.method} ${String(input)}` === INSTALL_LICENSE);
    const init = install?.[1];
    expect(init?.body instanceof FormData ? init.body.get("file") : null).toMatchObject({ name: "license.json" });
    expect(new Headers(init?.headers).get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() =>
      expect(fetch.mock.calls.filter(([input]) => String(input) === "/api/v1/auth/session").length).toBeGreaterThan(1),
    );
  });

  it("AC-100.02 shows License file is invalid for a changed file and keeps the previous license", async () => {
    renderLicense({
      [INSTALL_LICENSE]: licenseError(422, "LICENSE_INVALID", "License file is invalid"),
    });
    await findDetail("PPU-LIC-2026-0001");

    chooseLicenseFile(licenseFile());

    expect(await screen.findByRole("alert")).toHaveTextContent("License file is invalid");
    expect((await details()).getByText("PPU-LIC-2026-0001")).toBeInTheDocument();
  });

  it("shows Allowed file types: json for a file that is not JSON", async () => {
    renderLicense({ [INSTALL_LICENSE]: licenseError(415, "UNSUPPORTED_FILE_TYPE", "Allowed file types: json") });
    await findDetail("PPU-LIC-2026-0001");

    chooseLicenseFile(new File(["%PDF"], "license.pdf", { type: "application/pdf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Allowed file types: json");
  });

  it("shows No license is installed and still offers Install License", async () => {
    renderLicense({ [GET_LICENSE]: licenseError(404, "NOT_FOUND", "No license is installed") });

    expect(await screen.findByText("No license is installed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Install License" })).toBeEnabled();
    expect(screen.queryByRole("table", { name: "Licensed modules" })).not.toBeInTheDocument();
  });

  it("shows an expired license as Expired", async () => {
    renderLicense({ [GET_LICENSE]: { status: 200, body: { data: { ...activeLicense.data, status: "EXPIRED" } } } });

    expect(await findDetail("Expired")).toBeInTheDocument();
  });

  it("hides Install License without Update on License", async () => {
    renderLicense({}, ["VIEW"]);

    await findDetail("PPU-LIC-2026-0001");
    expect(screen.queryByRole("button", { name: "Install License" })).not.toBeInTheDocument();
  });
});
