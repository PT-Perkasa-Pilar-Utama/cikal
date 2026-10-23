import type { TaskListResponse, TaskStateResponse } from "./task.schema.js";

export const taskIdMock = "0192b6c0-0001-7000-8000-000000000001";

/** Contoh antrean Verification api-specs 14 §14.2: tugas yang sedang dipegang user sesi. */
export const taskListResponseMock = {
  data: [
    {
      id: taskIdMock,
      queueCode: "VERIFICATION",
      applicationId: "0192b6b0-0001-7000-8000-000000000001",
      loanId: "20102026KTA0000013",
      fullName: "Rudi Hartono",
      productCode: "KTA",
      branchCode: "011",
      status: "ASSIGNED",
      assignedTo: { id: "0192b6a2-0008-7000-8000-000000000001", username: "veri.01" },
      assignedAt: "2026-10-21T02:00:00Z",
      createdAt: "2026-10-21T01:58:00Z",
      version: 2,
      allowedActions: ["RELEASE", "PROCEED"],
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies TaskListResponse;

/** Respons "Assign to Me" (api-specs 14 §14.3, AC-58.01). */
export const taskAssignResponseMock = {
  data: {
    id: taskIdMock,
    status: "ASSIGNED",
    assignedTo: { id: "0192b6a2-0008-7000-8000-000000000002", username: "veri.02" },
    version: 3,
  },
} satisfies TaskStateResponse;

/** Respons "Release Me" (api-specs 14 §14.4, AC-58.03). */
export const taskReleaseResponseMock = {
  data: { id: taskIdMock, status: "OPEN", assignedTo: null, version: 4 },
} satisfies TaskStateResponse;
