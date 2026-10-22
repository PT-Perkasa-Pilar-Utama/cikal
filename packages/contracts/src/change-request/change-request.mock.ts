import type { ChangeRequestAccepted } from "../common/envelope.js";
import type {
  ChangeRequestDetailResponse,
  ChangeRequestListResponse,
  ChangeRequestReviewResponse,
} from "./change-request.schema.js";

const changeRequestId = "0192b6a4-0001-7000-8000-000000000001";
const maker = { id: "0192b6a0-7c1e-7b3a-9f41-2d6c1e0a9b11", username: "maker.01" };

export const changeRequestListResponseMock = {
  data: [
    {
      id: changeRequestId,
      entityType: "PRODUCT",
      entityId: null,
      action: "CREATE",
      displayName: "KPR Subsidi",
      packageSize: 1,
      status: "WAITING_APPROVAL",
      submittedBy: maker,
      submittedAt: "2026-10-21T03:10:00Z",
      canReview: true,
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies ChangeRequestListResponse;

export const changeRequestDetailResponseMock = {
  data: {
    id: changeRequestId,
    entityType: "PRODUCT",
    entityId: "0192b6a5-0001-7000-8000-000000000001",
    action: "UPDATE",
    packageSize: 1,
    status: "WAITING_APPROVAL",
    submittedBy: maker,
    submittedAt: "2026-10-21T03:10:00Z",
    canReview: true,
    currentData: { productCode: "KTA", limitAutoApproval: "10000000.00" },
    proposedData: { productCode: "KTA", limitAutoApproval: "15000000.00" },
    changedFields: ["limitAutoApproval"],
    reviseReason: null,
    reviewBlockedReason: null,
  },
} satisfies ChangeRequestDetailResponse;

export const changeRequestApproveResponseMock = {
  data: { id: changeRequestId, status: "APPROVED", entityId: "0192b6a5-0001-7000-8000-000000000001" },
  message: "Data approved",
} satisfies ChangeRequestReviewResponse;

export const changeRequestRejectResponseMock = {
  data: { id: changeRequestId, status: "REJECTED" },
  message: "Data rejected",
} satisfies ChangeRequestReviewResponse;

export const changeRequestAcceptedMock = (entityType: string, entityId: string | null): ChangeRequestAccepted => ({
  data: { changeRequestId, entityType, entityId, status: "WAITING_APPROVAL" },
  message: "Data submitted for approval",
});
