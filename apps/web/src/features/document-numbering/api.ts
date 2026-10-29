import {
  type DocumentNumberFormatUpdateRequest,
  type DocumentNumberPreviewRequest,
  type DocumentType,
  documentNumberFormatAcceptedSchema,
  documentNumberFormatListResponseSchema,
  documentNumberPreviewResponseSchema,
} from "@cikal/contracts";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const FORMATS_KEY = "document-number-formats";

/** `GET /api/v1/document-number-formats`: format ACTIVE SP3K dan CONTRACT (api-specs 10 §10.3). */
export function useNumberFormats() {
  return useQuery({
    queryKey: [FORMATS_KEY],
    queryFn: () => apiRequest(documentNumberFormatListResponseSchema, "/v1/document-number-formats"),
  });
}

/**
 * Pratinjau langsung `POST /api/v1/document-number-formats/preview` saat Maker mengetik pola (api-specs 10 §10.4).
 * Pratinjau terakhir tetap tampil selama pratinjau pola baru dimuat.
 */
export function useNumberPreview(request: DocumentNumberPreviewRequest) {
  return useQuery({
    queryKey: [FORMATS_KEY, "preview", request],
    queryFn: () =>
      apiRequest(documentNumberPreviewResponseSchema, "/v1/document-number-formats/preview", {
        method: "POST",
        body: JSON.stringify(request),
      }),
    enabled: request.pattern.trim().length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/** "Submit" mengajukan format baru ke Checker lewat ChangeRequest (api-specs 10 §10.5, AC-102.01). */
export function useUpdateNumberFormat(documentType: DocumentType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DocumentNumberFormatUpdateRequest) =>
      apiRequest(documentNumberFormatAcceptedSchema, `/v1/document-number-formats/${documentType}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FORMATS_KEY] }),
  });
}
