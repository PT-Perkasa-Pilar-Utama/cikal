import type { AuditLogDetailResponse, AuditLogItem, AuditLogListResponse } from "./audit-logs.schema.js";

/** Checker menyetujui perubahan produk KTA (AC-14.01, AC-14.02). */
const approveKta: AuditLogItem = {
  id: "0192b6a6-0002-7000-8000-000000000001",
  occurredAt: "2026-10-21T03:05:00.000Z",
  user: { username: "checker.001" },
  role: "Checker",
  module: "Product",
  eventType: "MASTER_DATA",
  action: "APPROVE",
  recordId: "KTA",
  description: "Approve change request",
  ipAddress: "10.10.1.25",
};

export const auditLogListResponseMock = {
  data: [approveKta],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies AuditLogListResponse;

/** Detail persetujuan: Limit Auto Approval berubah dari 15 juta menjadi 25 juta (AC-14.02). */
export const auditLogDetailResponseMock = {
  data: {
    ...approveKta,
    oldData: { productCode: "KTA", productName: "KTA Karyawan", limitAutoApproval: "15000000.00" },
    newData: { productCode: "KTA", productName: "KTA Karyawan", limitAutoApproval: "25000000.00" },
    changedFields: ["limitAutoApproval"],
  },
} satisfies AuditLogDetailResponse;
