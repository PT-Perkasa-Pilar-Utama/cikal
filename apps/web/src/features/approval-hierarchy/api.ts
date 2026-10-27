import {
  type ApprovalHierarchyCreate,
  approvalHierarchyListResponseSchema,
  branchListResponseSchema,
  changeRequestAcceptedSchema,
  userListResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const HIERARCHIES_KEY = "approval-hierarchies";
/** Batas `pageSize` API (api-specs 05 §5.1, 03 §3.6); dropdown memuat satu halaman penuh. */
const OPTIONS_PAGE_SIZE = 100;

/** `GET /api/v1/approval-hierarchies` untuk halaman "Approval Hierarchy" (api-specs 16 §16.1). */
export function useHierarchies(page: number) {
  return useQuery({
    queryKey: [HIERARCHIES_KEY, page],
    queryFn: () => apiRequest(approvalHierarchyListResponseSchema, `/v1/approval-hierarchies?page=${page}`),
  });
}

/** Cabang aktif untuk dropdown "Branch" (api-specs 05 §5.1). */
export function useBranchOptions() {
  return useQuery({
    queryKey: ["branches", "options"],
    queryFn: async () =>
      (await apiRequest(branchListResponseSchema, `/v1/branches?page=1&pageSize=${OPTIONS_PAGE_SIZE}`)).data,
  });
}

/** User aktif yang punya hak Approve di menu Approval untuk dropdown "Approver" (api-specs 03 §3.6, AC-27.01). */
export function useApproverOptions() {
  const query = new URLSearchParams({
    withAccess: "OPS-APPROVAL:APPROVE",
    page: "1",
    pageSize: String(OPTIONS_PAGE_SIZE),
  });
  return useQuery({
    queryKey: ["users", "approvers"],
    queryFn: async () => (await apiRequest(userListResponseSchema, `/v1/users?${query}`)).data,
  });
}

/** "Submit" New Hierarchy lewat checker-maker (api-specs 16 §16.2, AC-27.01, AC-27.02). */
export function useCreateHierarchy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApprovalHierarchyCreate) =>
      apiRequest(changeRequestAcceptedSchema, "/v1/approval-hierarchies", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [HIERARCHIES_KEY] }),
  });
}
