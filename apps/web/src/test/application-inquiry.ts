import {
  type ApplicationDetailResponse,
  type ApplicationInquiryItem,
  type ApplicationInquiryResponse,
  applicationDetailResponseMock,
  applicationInquiryResponseMock,
} from "@cikal/contracts";
import { inquirySession } from "./application-workflow";
import type { ApiRoutes } from "./render-app";

function mockItem(): ApplicationInquiryItem {
  const [item] = applicationInquiryResponseMock.data;
  if (!item) throw new Error("inquiry mock has no row");
  return item;
}

const baseItem = mockItem();

export const LIST_KEY = "GET /api/v1/applications?page=1";
export const DETAIL_LOAN_ID = applicationDetailResponseMock.data.loanId;
export const DETAIL_KEY = `GET /api/v1/applications/by-loan-id/${DETAIL_LOAN_ID}`;

/** Baris inquiry Rudi Hartono di langkah Approval; `overrides` mengganti kolomnya. */
export function inquiryItem(overrides: Partial<ApplicationInquiryItem> = {}): ApplicationInquiryItem {
  return { ...baseItem, ...overrides };
}

/** Satu halaman daftar inquiry dengan `totalItems` pengajuan (paging 20). */
export function inquiryPage(
  items: ApplicationInquiryItem[],
  page = 1,
  totalItems = items.length,
): {
  status: number;
  body: ApplicationInquiryResponse;
} {
  return {
    status: 200,
    body: { data: items, meta: { page, pageSize: 20, totalItems, totalPages: Math.ceil(totalItems / 20) } },
  };
}

export function detailResponse(overrides: Partial<ApplicationDetailResponse["data"]> = {}): {
  status: number;
  body: ApplicationDetailResponse;
} {
  return { status: 200, body: { data: { ...applicationDetailResponseMock.data, ...overrides } } };
}

/** Sesi Sales dengan Application Inquiry View, daftar berisi satu pengajuan, dan detailnya. */
export function inquiryRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /api/v1/auth/session": inquirySession,
    [LIST_KEY]: inquiryPage([inquiryItem()]),
    [DETAIL_KEY]: detailResponse(),
    ...extra,
  };
}
