import {
  changeRequestAcceptedSchema,
  changeRequestReviewResponseSchema,
  type DocumentChecklistCreateRequest,
  type ProductCreateRequest,
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
