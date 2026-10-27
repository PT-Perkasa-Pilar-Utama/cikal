import {
  type ApprovalDecisionRequest,
  applicationApprovalResponseSchema,
  approvalDecisionResponseSchema,
  financingResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, idempotencyHeader } from "../../lib/api/client";

const APPROVAL_KEY = "application-approval";
const FINANCING_KEY = "application-financing";

/** `GET /api/v1/applications/{id}/approval` untuk halaman "Approval Detail" (api-specs 16 §16.5). */
export function useApproval(applicationId: string) {
  return useQuery({
    queryKey: [APPROVAL_KEY, applicationId],
    queryFn: () => apiRequest(applicationApprovalResponseSchema, `/v1/applications/${applicationId}/approval`),
  });
}

/**
 * Approve, Reject, atau Return (api-specs 16 §16.6) dengan `Idempotency-Key` baru per keputusan. Detail, struktur
 * kredit, dan antrean dimuat ulang setelah selesai, berhasil atau gagal, agar keputusan approver lain ikut tampil
 * (AC-72.07).
 */
export function useApprovalDecision(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApprovalDecisionRequest) =>
      apiRequest(approvalDecisionResponseSchema, `/v1/applications/${applicationId}/approval/decision`, {
        method: "POST",
        headers: idempotencyHeader(),
        body: JSON.stringify(body),
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [APPROVAL_KEY, applicationId] }),
        queryClient.invalidateQueries({ queryKey: [FINANCING_KEY, applicationId] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]),
  });
}

/** Struktur kredit dan jadwal angsuran setelah disetujui (api-specs 16 §16.7, AC-72.01). */
export function useFinancing(applicationId: string, enabled: boolean) {
  return useQuery({
    queryKey: [FINANCING_KEY, applicationId],
    queryFn: () => apiRequest(financingResponseSchema, `/v1/applications/${applicationId}/financing`),
    enabled,
  });
}
