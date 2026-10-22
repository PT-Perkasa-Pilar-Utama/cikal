import type { ChangeRequestEntityType, ChangeRequestStatus } from "@cikal/contracts";

/** Nama jenis data di kolom "Type" layar Pending (api-specs 07 §7.1). */
export const ENTITY_TYPE_LABELS: Record<ChangeRequestEntityType, string> = {
  ROLE_ACCESS: "Role Access",
  PRODUCT: "Product",
  PRODUCT_PRICING: "Pricing",
  ROUTE: "Route",
  DOCUMENT_CHECKLIST: "Document Checklist",
  APPROVAL_HIERARCHY: "Approval Hierarchy",
  SCORING_MODEL: "Scoring Model",
  DECISION_MATRIX: "Decision Matrix",
  DOCUMENT_NUMBER_FORMAT: "Document Number Format",
  INTEGRATION_CONFIG: "Integration Config",
};

/** Teks status ChangeRequest; "Waiting Approval" mengikuti AC-20.01. */
export const STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  WAITING_APPROVAL: "Waiting Approval",
  REVISE: "Revise",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const ACTION_LABELS = { CREATE: "Create", UPDATE: "Update" } as const;
