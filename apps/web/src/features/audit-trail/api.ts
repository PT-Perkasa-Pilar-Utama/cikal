import { type AuditEventType, auditLogDetailResponseSchema, auditLogListResponseSchema } from "@cikal/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const AUDIT_KEY = "audit-logs";

/** Saringan "Audit Trail" yang berlaku setelah "Search" (AC-14.01, AC-14.06). */
export interface AuditSearch {
  occurredFrom: string;
  occurredTo: string;
  module?: string;
  eventType?: AuditEventType;
}

function searchParams(search: AuditSearch, page: number): string {
  const params = new URLSearchParams({ occurredFrom: search.occurredFrom, occurredTo: search.occurredTo });
  if (search.module) params.set("module", search.module);
  if (search.eventType) params.set("eventType", search.eventType);
  params.set("page", String(page));
  return params.toString();
}

/** `GET /api/v1/audit-logs` setelah "Search"; tanpa pencarian tidak ada request (api-specs 17 §17.2). */
export function useAuditLogs(search: AuditSearch | null, page: number) {
  return useQuery({
    queryKey: [AUDIT_KEY, search, page],
    queryFn: () => apiRequest(auditLogListResponseSchema, `/v1/audit-logs?${search ? searchParams(search, page) : ""}`),
    enabled: search !== null,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/** `GET /api/v1/audit-logs/{id}`: data sebelum dan sesudah (api-specs 17 §17.3, AC-14.02). */
export function useAuditLog(id: string) {
  return useQuery({
    queryKey: [AUDIT_KEY, id],
    queryFn: async () => (await apiRequest(auditLogDetailResponseSchema, `/v1/audit-logs/${id}`)).data,
  });
}
