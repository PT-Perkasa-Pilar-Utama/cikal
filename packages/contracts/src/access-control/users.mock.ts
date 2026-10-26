import type { UserListResponse } from "./users.schema.js";

/** Dropdown "Approver" dengan `withAccess=OPS-APPROVAL:APPROVE` (AC-27.01). */
export const approverListResponseMock = {
  data: [
    {
      id: "0192b6aa-0012-7000-8000-000000000012",
      username: "approver.01",
      fullName: "Joko Approver",
      roleName: "Approver",
      branchCode: "011",
      status: "ACTIVE",
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies UserListResponse;
