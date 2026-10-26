import type { BranchListResponse, RegionalListResponse } from "./organization.schema.js";

const jawaBarat = { id: "0192b6ae-0001-7000-8000-000000000001", regionalCode: "01", regionalName: "Jawa Barat" };

/** Dropdown cabang Approval Hierarchy: Bandung dan Cimahi (AC-27.01, MRTM TRM_APV_005). */
export const branchListResponseMock = {
  data: [
    {
      id: "0192b6ae-0101-7000-8000-000000000001",
      branchCode: "011",
      branchName: "Bandung",
      regional: jawaBarat,
      isActive: true,
    },
    {
      id: "0192b6ae-0102-7000-8000-000000000001",
      branchCode: "012",
      branchName: "Cimahi",
      regional: jawaBarat,
      isActive: true,
    },
  ],
  meta: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1 },
} satisfies BranchListResponse;

export const regionalListResponseMock = {
  data: [{ ...jawaBarat, isActive: true }],
  meta: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
} satisfies RegionalListResponse;
