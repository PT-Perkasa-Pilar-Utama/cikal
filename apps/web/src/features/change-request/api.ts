import { type ChangeRequestEntityType, changeRequestListResponseSchema } from "@cikal/contracts";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

/** Daftar "Pending <Data>" per jenis entity (api-specs 07 §7.2). */
export function usePendingChangeRequests(entityTypes: ChangeRequestEntityType[]) {
  const entityType = entityTypes.join(",");
  return useQuery({
    queryKey: ["change-requests", entityType],
    queryFn: () =>
      apiRequest(changeRequestListResponseSchema, `/v1/change-requests?entityType=${encodeURIComponent(entityType)}`),
  });
}
