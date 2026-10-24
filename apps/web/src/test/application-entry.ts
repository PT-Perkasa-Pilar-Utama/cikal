import {
  type ApplicationDraftResponse,
  applicationDraftListResponseMock,
  applicationDraftResponseMock,
  availableProductsResponseMock,
  cityOptionsResponseMock,
  insuranceListResponseMock,
  type ParameterOptionsResponse,
  type SessionResponse,
  sessionResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";
import { type ApiRoutes, type StubResponse, type stubApi } from "./render-app";

/** Sesi Sales: menu Data Entry dengan hak View, Create, dan Update (AC-39, AC-40). */
export const salesSession: StubResponse = {
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
              menuCode: "APP-ENTRY",
              menuName: "Data Entry",
              link: "/applications/new",
              iconName: "file-plus",
              actions: ["VIEW", "CREATE", "UPDATE"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

const options = (...values: [string, string][]): StubResponse => ({
  status: 200,
  body: {
    data: values.map(([paramId, paramValue]) => ({ paramId, paramValue, isActive: true })),
  } satisfies ParameterOptionsResponse,
});

/** Draft hasil "Next" pertama di step Application: API memindahkan draft ke step Personal. */
export const draftCreated: StubResponse = {
  status: 201,
  body: {
    data: { ...applicationDraftResponseMock.data, currentSection: "personal" },
  } satisfies ApplicationDraftResponse,
};

export const DRAFT_ID = applicationDraftResponseMock.data.id;
export const [kta] = availableProductsResponseMock.data;

/** Rute API form pengajuan: sesi Sales, pilihan General Parameter, produk, asuransi, dan wilayah berjenjang. */
export function entryRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /api/v1/auth/session": salesSession,
    "GET /api/v1/parameters/Application%20Type/options": options(["NTB", "NTB"]),
    "GET /api/v1/parameters/Segment/options": options(["MIKRO", "Mikro"]),
    "GET /api/v1/parameters/Purpose%20of%20Loan/options": options(),
    "GET /api/v1/parameters/Gender/options": options(["L", "Laki-laki"], ["P", "Perempuan"]),
    "GET /api/v1/parameters/Religion/options": options(["ISLAM", "Islam"]),
    "GET /api/v1/parameters/Nationality/options": options(["WNI", "WNI"]),
    "GET /api/v1/parameters/Education/options": options(["S1", "S1"]),
    "GET /api/v1/parameters/Marital/options": options(["001", "Belum Kawin"], ["002", "Kawin"]),
    "GET /api/v1/insurances": { status: 200, body: insuranceListResponseMock },
    "GET /api/v1/products/available?productCategory=NON_COLLATERAL": {
      status: 200,
      body: availableProductsResponseMock,
    },
    "GET /api/v1/regions/provinces": {
      status: 200,
      body: {
        data: [
          { code: "31", name: "DKI JAKARTA", parentCode: null },
          { code: "32", name: "JAWA BARAT", parentCode: null },
        ],
      },
    },
    "GET /api/v1/regions/cities?provinceCode=31": { status: 200, body: cityOptionsResponseMock },
    "GET /api/v1/regions/cities?provinceCode=32": {
      status: 200,
      body: { data: [{ code: "3273", name: "KOTA BANDUNG", parentCode: "32" }] },
    },
    "GET /api/v1/regions/districts?cityCode=3171": {
      status: 200,
      body: { data: [{ code: "317101", name: "GAMBIR", parentCode: "3171" }] },
    },
    "GET /api/v1/regions/sub-districts?districtCode=317101": {
      status: 200,
      body: { data: [{ code: "3171011001", name: "GAMBIR", parentCode: "317101", zipCode: "10110" }] },
    },
    "GET /api/v1/applications/drafts?page=1": { status: 200, body: applicationDraftListResponseMock },
    ...extra,
  };
}

/** Envelope error dengan satu `details[]` per field penyebab (api-specs 12 §12.3). */
export function rejected(status: number, code: string, message: string, fields: [string, string][]): StubResponse {
  return {
    status,
    body: {
      code,
      message,
      details: fields.map(([field, detail]) => ({ field, code, message: detail })),
      correlationId: "c-1",
    },
  };
}

const label = (name: string) => new RegExp(`^${name}\\*?$`);
const scope = (group?: string) => (group ? within(screen.getByRole("group", { name: group })) : screen);

/** Pilih `option`; dropdown dicari ulang karena dipasang ulang saat pilihannya tiba. */
export async function choose(name: string, option: string, group?: string) {
  const select = () => scope(group).getByLabelText(label(name));
  const value = await waitFor(() => within(select()).getByRole("option", { name: option }));
  fireEvent.change(select(), { target: { value: value.getAttribute("value") } });
}

export function type(name: string, value: string, group?: string) {
  fireEvent.change(scope(group).getByLabelText(label(name)), { target: { value } });
}

/** Isi step Application sesuai AC-39.01 dengan identitas pemohon AC-40.01. */
export async function fillApplicationStep(values: { requestedLimit?: string; tenorProposed?: string } = {}) {
  await screen.findByRole("form", { name: "Application" });
  await choose("Application Type", "NTB");
  await choose("Segment", "Mikro");
  await choose("Product Category", "Non Collateral Loan");
  await choose("Product", kta?.productCode ?? "");
  type("Tenor Proposed", values.tenorProposed ?? "36");
  type("Requested Limit", values.requestedLimit ?? "20.000.000");
  await choose("Insurance", "Asuransi Contoh");
  type("ID Card Number", "3273011402900001");
  type("Full Name", "Rudi Hartono");
  type("Full Name ID", "RUDI HARTONO");
}

export const clickButton = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

/** Body request `method` terakhir yang dikirim ke `path`. */
export function sentBody(fetchSpy: ReturnType<typeof stubApi>, method: string, path: string): unknown {
  const call = fetchSpy.mock.calls.findLast(([input, init]) => init?.method === method && String(input) === path);
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

const stepper = () => within(screen.getByRole("list", { name: "Application steps" }));

/** Tab step yang sedang aktif di stepper. */
export const activeStep = () => stepper().getByRole("listitem", { current: "step" });

/** Tab step dengan label `name` di stepper. */
export const step = (name: string) => stepper().getByText(name).closest("li");

/** Tunggu sampai stepper menandai `name` sebagai step aktif. */
export const expectStep = (name: string) => waitFor(() => expect(activeStep()).toHaveTextContent(name));
