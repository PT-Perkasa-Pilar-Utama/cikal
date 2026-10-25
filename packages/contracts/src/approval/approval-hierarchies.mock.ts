import type { ApprovalHierarchyListResponse } from "./approval-hierarchies.schema.js";

const bandung = { id: "0192b6ae-0101-7000-8000-000000000001", branchCode: "011" };
const ktaQa = { id: "0192b6ca-0001-7000-8000-000000000001", productCode: "KTAQA" };

/** Hierarki KTA QA Bandung: level 2 naik ke level 1; approver level 1 nonaktif (AC-27.03). */
export const approvalHierarchyListResponseMock = {
  data: [
    {
      id: "0192b6af-0101-7000-8000-000000000001",
      branch: bandung,
      product: ktaQa,
      jobLevel: 2,
      subLevel: 1,
      levelDescription: "Kepala Cabang",
      upLevel: 1,
      upSubLevel: 1,
      approver: {
        id: "0192b6aa-0013-7000-8000-000000000013",
        username: "kepala.cabang",
        fullName: "Kartika Kepala Cabang",
        status: "ACTIVE",
      },
      approverInactive: false,
      isActive: true,
      hasPendingChange: false,
    },
    {
      id: "0192b6af-0102-7000-8000-000000000001",
      branch: bandung,
      product: ktaQa,
      jobLevel: 1,
      subLevel: 1,
      levelDescription: "Kepala Wilayah",
      upLevel: null,
      upSubLevel: null,
      approver: {
        id: "0192b6aa-0012-7000-8000-000000000012",
        username: "approver.01",
        fullName: "Joko Approver",
        status: "INACTIVE",
      },
      approverInactive: true,
      isActive: true,
      hasPendingChange: false,
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
} satisfies ApprovalHierarchyListResponse;
