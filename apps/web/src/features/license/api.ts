import { licenseInstallResponseSchema, licenseResponseSchema } from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, idempotencyHeader } from "../../lib/api/client";

const LICENSE_KEY = "license";

/** `GET /api/v1/license`: lisensi ACTIVE company sesi, modul, dan masa berlaku (api-specs 04 §4.1, AC-100.01). */
export function useLicense() {
  return useQuery({
    queryKey: [LICENSE_KEY],
    queryFn: async () => (await apiRequest(licenseResponseSchema, "/v1/license")).data,
  });
}

/**
 * `POST /api/v1/license` dengan `Idempotency-Key` wajib (api-specs 04 §4.2). Lisensi baru mengubah menu sesi, jadi
 * sesi dimuat ulang bersama halaman; file yang ditolak membiarkan lisensi lama tetap tampil (AC-100.02).
 */
export function useInstallLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return apiRequest(licenseInstallResponseSchema, "/v1/license", {
        method: "POST",
        body,
        headers: idempotencyHeader(),
      });
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [LICENSE_KEY] }),
        queryClient.invalidateQueries({ queryKey: ["session"] }),
      ]),
  });
}
