import type {
  DocumentNumberFormatAccepted,
  DocumentNumberFormatListResponse,
  DocumentNumberPreviewResponse,
} from "./number-formats.schema.js";

/** Format default saat aktivasi tenant (grooming v3 DN-10, api-specs 10 §10.3). */
export const documentNumberFormatListResponseMock = {
  data: [
    {
      id: "0192b6cc-0001-7000-8000-000000000001",
      documentType: "SP3K",
      pattern: "{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}",
      resetPeriod: "MONTHLY",
      counterScope: "BRANCH",
      versionNumber: 1,
      status: "ACTIVE",
      effectiveFrom: "2026-10-01T00:00:00.000Z",
      hasPendingChange: false,
    },
    {
      id: "0192b6cc-0002-7000-8000-000000000001",
      documentType: "CONTRACT",
      pattern: "{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}",
      resetPeriod: "YEARLY",
      counterScope: "BRANCH",
      versionNumber: 1,
      status: "ACTIVE",
      effectiveFrom: "2026-10-01T00:00:00.000Z",
      hasPendingChange: false,
    },
  ],
} satisfies DocumentNumberFormatListResponse;

/** Pratinjau pola "SP3K-{BRANCH_CODE}-{YYYY}{MM}-{SEQ:5}" (AC-102.01). */
export const documentNumberPreviewResponseMock = {
  data: { preview: "SP3K-011-202610-00001" },
} satisfies DocumentNumberPreviewResponse;

export const documentNumberFormatAcceptedMock = {
  data: {
    changeRequestId: "0192b6a8-0001-7000-8000-000000000009",
    entityType: "DOCUMENT_NUMBER_FORMAT",
    entityId: "0192b6cc-0003-7000-8000-000000000001",
    status: "WAITING_APPROVAL",
    versionNumber: 2,
    preview: "SP3K-011-202610-00001",
  },
} satisfies DocumentNumberFormatAccepted;
