import {
  changeRequestAcceptedSchema,
  changeRequestReviewResponseSchema,
  type DocumentChecklistCreateRequest,
  type ProductCreateRequest,
  type ProductPricingUpdateRequest,
  type ProductRouteUpdateRequest,
  type StepCode,
} from "@cikal/contracts";
import { todayIsoDate } from "../../src/lib/format";
import { ApiSession } from "./api-session";
import type { SessionUser } from "./seed-users";

/** Produk valid dengan nilai AC-20.01; kode dan nama diganti per test. */
const productRequest = (productCode: string, productName: string): ProductCreateRequest => ({
  productCode,
  productName,
  productCategory: "NON_COLLATERAL",
  interestType: "EFFECTIVE",
  minPlafond: "5000000.00",
  maxPlafond: "300000000.00",
  minTenor: 6,
  maxTenor: 60,
  minAge: 21,
  maxAge: 55,
  dbrMax: "40.0000",
  limitAutoApproval: "10000000.00",
  validFrom: todayIsoDate(),
});

/** Pengajuan produk baru lewat `POST /api/v1/products` (api-specs 08 §8.3); hasilnya id ChangeRequest. */
export async function submitProduct(username: SessionUser, productCode: string, productName: string): Promise<string> {
  const accepted = await ApiSession.as(username, (maker) =>
    maker.post(changeRequestAcceptedSchema, "/api/v1/products", productRequest(productCode, productName)),
  );
  return accepted.data.changeRequestId;
}

/** Persetujuan lewat `POST /api/v1/change-requests/{id}/approve` (api-specs 07 §7.4); hasilnya id data. */
export async function approve(username: SessionUser, changeRequestId: string): Promise<string | null> {
  const reviewed = await ApiSession.as(username, (checker) =>
    checker.post(changeRequestReviewResponseSchema, `/api/v1/change-requests/${changeRequestId}/approve`, {}),
  );
  return reviewed.data.entityId ?? null;
}

/** Pengajuan checklist dokumen lewat `POST /api/v1/document-checklists` (api-specs 08 §8.11). */
export async function submitChecklist(username: SessionUser, body: DocumentChecklistCreateRequest): Promise<string> {
  const accepted = await ApiSession.as(username, (maker) =>
    maker.post(changeRequestAcceptedSchema, "/api/v1/document-checklists", body),
  );
  return accepted.data.changeRequestId;
}

/** Pricing dengan suku bunga 14% p.a. yang berlaku hari ini (AC-97.01, AC-97.04). */
const pricingRequest = (): ProductPricingUpdateRequest => ({
  adminFee: "500000.00",
  provisionFee: "1.0000",
  subProducts: [{ interestRate: "14.0000", validFrom: todayIsoDate() }],
});

/** Rute dengan Dedup sebagai langkah otomatis pertama setelah Data Entry, ditambah langkah wajib (RT-03). */
const ROUTE_STEPS: readonly StepCode[] = [
  "DATA_ENTRY",
  "DEDUP",
  "APPROVAL",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
];
const routeRequest = (steps: readonly StepCode[]): ProductRouteUpdateRequest => ({
  steps: steps.map((stepCode) => ({ stepCode, isEnabled: true })),
});

/**
 * Produk yang tersedia untuk pengajuan baru (api-specs 08 §8.7): produk, pricing, dan rute masing-masing diajukan
 * Maker lalu disetujui Checker dengan langkah rute `routeSteps`. Hasilnya id produk.
 */
export async function availableProduct(
  productCode: string,
  productName: string,
  routeSteps: readonly StepCode[] = ROUTE_STEPS,
): Promise<string> {
  const productId = (await approve("checker.001", await submitProduct("maker.01", productCode, productName))) ?? "";
  for (const [path, body] of [
    [`/api/v1/products/${productId}/pricing`, pricingRequest()],
    [`/api/v1/products/${productId}/route`, routeRequest(routeSteps)],
  ] as const) {
    const accepted = await ApiSession.as("maker.01", (maker) => maker.put(changeRequestAcceptedSchema, path, body));
    await approve("checker.001", accepted.data.changeRequestId);
  }
  return productId;
}
