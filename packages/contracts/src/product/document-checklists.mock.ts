import type { DocumentChecklistListResponse } from "./document-checklists.schema.js";

/** Checklist KPR / Karyawan Swasta / Kawin (AC-25.01). */
export const documentChecklistListResponseMock = {
  data: [
    {
      id: "0192b6f2-0001-7000-8000-000000000001",
      product: { id: "0192b6f2-0001-7000-8000-000000000002", productCode: "KPR", productName: "KPR Subsidi" },
      occupation: { paramId: "001", paramValue: "Karyawan Swasta" },
      marital: { paramId: "002", paramValue: "Kawin" },
      items: [
        { documentType: "KTP", documentName: "KTP", isMandatory: true },
        { documentType: "BPJS", documentName: "BPJS", isMandatory: false },
      ],
      isActive: true,
      hasPendingChange: false,
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies DocumentChecklistListResponse;
