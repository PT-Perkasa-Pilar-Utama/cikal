import { type SessionResponse, sessionResponseMock } from "@cikal/contracts";
import { useQuery } from "@tanstack/react-query";

/**
 * Konteks sesi untuk layout: identitas, menu sesuai hak, lisensi (api-specs 02 §2.4).
 * Memakai mock kontrak sampai `GET /api/v1/auth/session` dibangun di BE-S1-01 dan disambungkan di FE-S1-01.
 */
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async (): Promise<SessionResponse["data"]> => sessionResponseMock.data,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
