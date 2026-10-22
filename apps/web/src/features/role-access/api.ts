import {
  changeRequestAcceptedSchema,
  menuTreeResponseSchema,
  type RoleAccessCreateRequest,
  roleAccessListResponseSchema,
  roleListResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const ROLE_ACCESS_KEY = "role-access";
/** Batas `pageSize` kontrak; 16 role seed muat dalam satu halaman dropdown. */
const ROLE_OPTIONS_PAGE_SIZE = 100;

/** `GET /api/v1/role-access` untuk halaman "Role Access" (api-specs 03 §3.3). */
export function useRoleAccessList(page = 1) {
  return useQuery({
    queryKey: [ROLE_ACCESS_KEY, "list", page],
    queryFn: () => apiRequest(roleAccessListResponseSchema, `/v1/role-access?page=${page}`),
  });
}

/** Dropdown "Role" dari `GET /api/v1/roles` (api-specs 03 §3.1). */
export function useRoleOptions() {
  return useQuery({
    queryKey: ["roles", "options"],
    queryFn: async () =>
      (await apiRequest(roleListResponseSchema, `/v1/roles?pageSize=${ROLE_OPTIONS_PAGE_SIZE}`)).data,
  });
}

/** Dropdown "Menu" dan "Sub Menu" dari pohon `GET /api/v1/menus` (api-specs 03 §3.2). */
export function useMenuTree() {
  return useQuery({
    queryKey: ["menus", "tree"],
    queryFn: async () => (await apiRequest(menuTreeResponseSchema, "/v1/menus")).data,
  });
}

/** `POST /api/v1/role-access` lewat checker-maker; balasannya 202 (api-specs 03 §3.4). */
export function useCreateRoleAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RoleAccessCreateRequest) =>
      apiRequest(changeRequestAcceptedSchema, "/v1/role-access", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ROLE_ACCESS_KEY] }),
  });
}
