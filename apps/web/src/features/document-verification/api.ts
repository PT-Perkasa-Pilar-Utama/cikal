import {
  applicationVerificationResponseSchema,
  fileDownloadUrlResponseSchema,
  type VerificationSaveRequest,
  verificationSaveResponseSchema,
  verificationSubmitResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, idempotencyHeader } from "../../lib/api/client";

const VERIFICATION_KEY = "application-verification";

const verificationPath = (applicationId: string) => `/v1/applications/${applicationId}/verification`;

/** `GET /api/v1/applications/{id}/verification` untuk layar "Verification Detail" (api-specs 15 §15.1). */
export function useVerification(applicationId: string) {
  return useQuery({
    queryKey: [VERIFICATION_KEY, applicationId],
    queryFn: () => apiRequest(applicationVerificationResponseSchema, verificationPath(applicationId)),
  });
}

/** "Save" menyimpan status sebagian lalu memuat ulang status tersimpan (api-specs 15 §15.2, AC-64.04). */
export function useSaveVerification(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: VerificationSaveRequest) =>
      apiRequest(verificationSaveResponseSchema, verificationPath(applicationId), {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [VERIFICATION_KEY, applicationId] }),
  });
}

/** "Submit" menutup tugas Verification (api-specs 15 §15.3); `Idempotency-Key` baru per klik. */
export function useSubmitVerification(applicationId: string) {
  return useMutation({
    mutationFn: (body: VerificationSaveRequest) =>
      apiRequest(verificationSubmitResponseSchema, `${verificationPath(applicationId)}/submit`, {
        method: "POST",
        headers: idempotencyHeader(),
        body: JSON.stringify(body),
      }),
  });
}

/** URL bertanda tangan untuk pratinjau dokumen (api-specs 10 §10.1, AC-64.05). */
export function useFileUrl(fileId: string) {
  return useQuery({
    queryKey: ["file-url", fileId],
    queryFn: () => apiRequest(fileDownloadUrlResponseSchema, `/v1/files/${fileId}/download-url`),
    // URL berumur 5 menit; dimuat ulang tiap kali pratinjau dibuka lagi.
    staleTime: 0,
    gcTime: 0,
  });
}
