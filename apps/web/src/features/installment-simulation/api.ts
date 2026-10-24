import { type InstallmentSimulationRequest, installmentSimulationResponseSchema } from "@cikal/contracts";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

/** `POST /api/v1/calculations/installment-simulation` (api-specs 09 §9.1); operasi baca tanpa cache. */
export function useInstallmentSimulation() {
  return useMutation({
    mutationFn: async (body: InstallmentSimulationRequest) =>
      (
        await apiRequest(installmentSimulationResponseSchema, "/v1/calculations/installment-simulation", {
          method: "POST",
          body: JSON.stringify(body),
        })
      ).data,
  });
}
