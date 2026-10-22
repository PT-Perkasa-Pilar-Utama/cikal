import {
  type ChangeRequestEntityType,
  changeRequestDetailResponseSchema,
  changeRequestListResponseSchema,
  changeRequestReviewResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

type ReviewDecision = "approve" | "reject";

/** Daftar "Pending <Data>" per jenis entity (api-specs 07 §7.2). */
export function usePendingChangeRequests(entityTypes: ChangeRequestEntityType[], page = 1) {
  const entityType = entityTypes.join(",");
  return useQuery({
    queryKey: ["change-requests", "list", entityType, page],
    queryFn: () =>
      apiRequest(
        changeRequestListResponseSchema,
        `/v1/change-requests?entityType=${encodeURIComponent(entityType)}&page=${page}`,
      ),
  });
}

/** Detail dengan perbandingan "Current Data" dan "Proposed Data" (api-specs 07 §7.3). */
export function useChangeRequest(id: string) {
  return useQuery({
    queryKey: ["change-requests", "detail", id],
    queryFn: async () => (await apiRequest(changeRequestDetailResponseSchema, `/v1/change-requests/${id}`)).data,
  });
}

/**
 * Approve atau reject (api-specs 07 §7.4, §7.5). Hasilnya bisa mengubah data apa pun, termasuk menu sesi lewat
 * Role Access, dan permintaan yang sudah diproses Checker lain juga perlu hilang dari daftar (AC-12.05), jadi
 * semua query dimuat ulang setelah selesai, berhasil atau gagal.
 */
export function useReviewChangeRequest(id: string, decision: ReviewDecision) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest(changeRequestReviewResponseSchema, `/v1/change-requests/${id}/${decision}`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSettled: () => queryClient.invalidateQueries(),
  });
}
