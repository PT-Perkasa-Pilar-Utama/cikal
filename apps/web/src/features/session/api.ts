import {
  type Action,
  type LoginRequest,
  loginResponseSchema,
  type MenuCode,
  sessionResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { apiRequest } from "../../lib/api/client";
import { menuActions } from "./menu-access";

const noContentSchema = z.null();

/** Konteks sesi untuk layout: identitas header, menu sesuai hak, lisensi (api-specs 02 §2.4). */
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => (await apiRequest(sessionResponseSchema, "/v1/auth/session")).data,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Aksi sesi pada satu menu untuk menampilkan atau menyembunyikan tombol; server tetap memeriksa (AC-09.02). */
export function useMenuActions(menuCode: MenuCode): ReadonlySet<Action> {
  const { data } = useSession();
  return menuActions(data?.menus ?? [], menuCode);
}

/** `POST /api/v1/auth/login` (api-specs 02 §2.2); berhasil membuka halaman "Dashboard" (AC-01.01). */
export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiRequest(loginResponseSchema, "/v1/auth/login", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: "/", replace: true });
    },
  });
}

/**
 * `POST /api/v1/auth/logout` (api-specs 02 §2.3). Cache dibuang setelah pindah ke "Login", jadi tombol Back memuat
 * ulang sesi, mendapat 401, dan kembali ke "Login" (AC-06.01).
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => apiRequest(noContentSchema, "/v1/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      await navigate({ to: "/login", replace: true });
      queryClient.clear();
    },
  });
}
