import {
  changeRequestAcceptedSchema,
  type DocumentChecklistCreateRequest,
  documentChecklistListResponseSchema,
  type ParamType,
  parameterOptionsResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const CHECKLISTS_KEY = "document-checklists";

/** `GET /api/v1/document-checklists` (api-specs 08 §8.12). */
export function useChecklists(page = 1) {
  return useQuery({
    queryKey: [CHECKLISTS_KEY, "list", page],
    queryFn: () => apiRequest(documentChecklistListResponseSchema, `/v1/document-checklists?page=${page}`),
  });
}

/** `POST /api/v1/document-checklists` lewat checker-maker (api-specs 08 §8.11). */
export function useCreateChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DocumentChecklistCreateRequest) =>
      apiRequest(changeRequestAcceptedSchema, "/v1/document-checklists", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHECKLISTS_KEY] }),
  });
}

/** Pilihan General Parameter aktif untuk dropdown (api-specs 06 §6.1). */
export function useParameterOptions(paramType: ParamType) {
  return useQuery({
    queryKey: ["parameters", paramType],
    queryFn: async () =>
      (await apiRequest(parameterOptionsResponseSchema, `/v1/parameters/${encodeURIComponent(paramType)}/options`))
        .data,
  });
}
