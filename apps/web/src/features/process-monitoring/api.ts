import {
  type MonitoringStatus,
  type ProcessFinishRequest,
  processFinishResponseSchema,
  processMonitoringResponseSchema,
  stepRetryResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, idempotencyHeader } from "../../lib/api/client";

const MONITORING_KEY = "process-monitoring";

/** `GET /api/v1/process-monitoring`; tanpa `status` keempat status langkah ikut tampil (api-specs 13 §13.3). */
export function useProcessMonitoring(status: MonitoringStatus | undefined, page: number) {
  const query = new URLSearchParams({ ...(status && { status }), page: String(page) });
  return useQuery({
    queryKey: [MONITORING_KEY, status, page],
    queryFn: () => apiRequest(processMonitoringResponseSchema, `/v1/process-monitoring?${query}`),
  });
}

/**
 * Retry dan Finish mengubah langkah saat ini, jadi daftar dimuat ulang setelah selesai, berhasil atau gagal:
 * retry yang ERROR lagi tetap menambah attempt (AC-86.03).
 */
function useMonitoringMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: [MONITORING_KEY] }),
  });
}

/** `POST /api/v1/processes/{processInstanceId}/steps/{stepExecutionId}/retry` (api-specs 13 §13.4). */
export const useRetryStep = (processInstanceId: string) =>
  useMonitoringMutation((stepExecutionId: string) =>
    apiRequest(stepRetryResponseSchema, `/v1/processes/${processInstanceId}/steps/${stepExecutionId}/retry`, {
      method: "POST",
      headers: idempotencyHeader(),
    }),
  );

/** `POST /api/v1/processes/{processInstanceId}/finish` (api-specs 13 §13.5). */
export const useFinishProcess = (processInstanceId: string) =>
  useMonitoringMutation((body: ProcessFinishRequest) =>
    apiRequest(processFinishResponseSchema, `/v1/processes/${processInstanceId}/finish`, {
      method: "POST",
      headers: idempotencyHeader(),
      body: JSON.stringify(body),
    }),
  );
