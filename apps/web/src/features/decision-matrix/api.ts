import {
  changeRequestAcceptedSchema,
  type DecisionMatrixRowInput,
  type DecisionSimulationRequest,
  decisionMatrixListResponseSchema,
  decisionSimulationResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const MATRIX_KEY = "decision-matrix";

/** `GET /api/v1/decision-matrix`, urut prioritas naik (api-specs 24 §24.2). */
export function useDecisionMatrix(page: number) {
  return useQuery({
    queryKey: [MATRIX_KEY, page],
    queryFn: () => apiRequest(decisionMatrixListResponseSchema, `/v1/decision-matrix?page=${page}`),
  });
}

/**
 * `PUT /api/v1/decision-matrix/rows/{id}` lewat checker-maker (api-specs 24 §24.2). Daftar dimuat ulang agar baris
 * yang diajukan tampil sebagai pending.
 */
export function useUpdateMatrixRow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DecisionMatrixRowInput) =>
      apiRequest(changeRequestAcceptedSchema, `/v1/decision-matrix/rows/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MATRIX_KEY] }),
  });
}

/** `POST /api/v1/decision-matrix/simulate` dengan matrix aktif atau pending (api-specs 24 §24.3). */
export function useSimulateDecision() {
  return useMutation({
    mutationFn: (body: DecisionSimulationRequest) =>
      apiRequest(decisionSimulationResponseSchema, "/v1/decision-matrix/simulate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
