import {
  applicationDetailResponseSchema,
  applicationInquiryResponseSchema,
  fileDownloadUrlResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";
import { type InquiryParams, inquirySearch } from "./inquiry-params";

/** Langkah pengajuan berubah di server tanpa aksi user, jadi daftar dimuat ulang berkala (AC-83.06). */
export const INQUIRY_REFRESH_MS = 30_000;

/** `GET /api/v1/applications` untuk "Application Inquiry" (api-specs 17 §17.1). */
export function useApplicationInquiry(params: InquiryParams) {
  return useQuery({
    queryKey: ["application-inquiry", params],
    queryFn: () => apiRequest(applicationInquiryResponseSchema, `/v1/applications?${inquirySearch(params)}`),
    refetchInterval: INQUIRY_REFRESH_MS,
    placeholderData: (previous) => previous,
  });
}

/** `GET /api/v1/applications/by-loan-id/{loanId}`; setiap pembukaan tercatat di audit (api-specs 12 §12.10). */
export function useApplicationDetail(loanId: string) {
  return useQuery({
    queryKey: ["application-detail", loanId],
    queryFn: async () =>
      (await apiRequest(applicationDetailResponseSchema, `/v1/applications/by-loan-id/${encodeURIComponent(loanId)}`))
        .data,
    retry: false,
  });
}

/** URL unduhan PDF berumur 5 menit; diminta saat ikon "Download" diklik (api-specs 10 §10.1, AC-84.02). */
export function useDownloadUrl() {
  return useMutation({
    mutationFn: async (fileId: string) =>
      (await apiRequest(fileDownloadUrlResponseSchema, `/v1/files/${fileId}/download-url?disposition=attachment`)).data
        .url,
  });
}
