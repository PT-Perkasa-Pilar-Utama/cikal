import {
  type AkadPrintRequest,
  akadPrintResponseSchema,
  type DisbursementRecordRequest,
  disbursementDetailResponseSchema,
  disbursementRecordResponseSchema,
  parameterOptionsResponseSchema,
  userListResponseSchema,
  type ValidityCheckRequest,
  validityCheckResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, idempotencyHeader } from "../../lib/api/client";

const DISBURSEMENT_KEY = "disbursement";
const applicationPath = (applicationId: string) => `/v1/applications/${applicationId}`;

/** "Disbursement Detail" untuk Validity Check, Print Akad, dan Record Disbursement (api-specs 25 §25.1). */
export function useDisbursement(applicationId: string) {
  return useQuery({
    queryKey: [DISBURSEMENT_KEY, applicationId],
    queryFn: () => apiRequest(disbursementDetailResponseSchema, `${applicationPath(applicationId)}/disbursement`),
  });
}

/** Perintah langkah pencairan dengan `Idempotency-Key` baru; detail dan antrean dimuat ulang setelahnya. */
function useStepCommand<TBody, TResult>(applicationId: string, send: (body: TBody) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [DISBURSEMENT_KEY, applicationId] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]),
  });
}

const post = (body: unknown) => ({ method: "POST", headers: idempotencyHeader(), body: JSON.stringify(body) });

/** Valid atau Not Valid (api-specs 25 §25.2, AC-76.01, AC-76.04). */
export const useValidityCheck = (applicationId: string) =>
  useStepCommand(applicationId, (body: ValidityCheckRequest) =>
    apiRequest(validityCheckResponseSchema, `${applicationPath(applicationId)}/validity-check`, post(body)),
  );

/** "Print" akad; PDF diunduh dari `downloadUrl` bertanda tangan (api-specs 25 §25.3, AC-77.01). */
export const usePrintAkad = (applicationId: string) =>
  useStepCommand(applicationId, (body: AkadPrintRequest) =>
    apiRequest(akadPrintResponseSchema, `${applicationPath(applicationId)}/akad/print`, post(body)),
  );

/** Hasil pencairan Disbursed atau Failed (api-specs 25 §25.4, AC-101.01, AC-101.02). */
export const useRecordDisbursement = (applicationId: string) =>
  useStepCommand(applicationId, (body: DisbursementRecordRequest) =>
    apiRequest(disbursementRecordResponseSchema, `${applicationPath(applicationId)}/disbursement/record`, post(body)),
  );

/** Pilihan aktif parameter "Payment Method" (api-specs 06 §6.1). */
export function usePaymentMethods() {
  return useQuery({
    queryKey: ["parameter-options", "Payment Method"],
    queryFn: async () =>
      (
        await apiRequest(
          parameterOptionsResponseSchema,
          `/v1/parameters/${encodeURIComponent("Payment Method")}/options`,
        )
      ).data,
  });
}

/** User aktif dengan Update di Recontest, yaitu Risk Manager, untuk dropdown "Risk Manager" (api-specs 03 §3.6). */
export function useRiskManagers() {
  return useQuery({
    queryKey: ["users", "risk-managers"],
    queryFn: async () =>
      (await apiRequest(userListResponseSchema, "/v1/users?withAccess=OPS-RECONTEST:UPDATE&pageSize=100")).data,
  });
}
