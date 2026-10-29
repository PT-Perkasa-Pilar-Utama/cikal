import {
  type CriterionInput,
  changeRequestAcceptedSchema,
  criterionResponseSchema,
  formulaVariableListResponseSchema,
  type ScoringModelTestRequest,
  scoringModelDetailResponseSchema,
  scoringModelListResponseSchema,
  scoringModelTestResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const MODELS_KEY = "scoring-models";
const modelPath = (modelId: string) => `/v1/scoring-models/${modelId}`;

/** `GET /api/v1/scoring-models` untuk halaman "Scoring Model" (api-specs 22 §22.1). */
export function useScoringModels(page: number) {
  return useQuery({
    queryKey: [MODELS_KEY, "list", page],
    queryFn: () => apiRequest(scoringModelListResponseSchema, `/v1/scoring-models?page=${page}`),
  });
}

/** `GET /api/v1/scoring-models/{id}` dengan daftar kriteria (api-specs 22 §22.2). */
export function useScoringModel(modelId: string) {
  return useQuery({
    queryKey: [MODELS_KEY, modelId],
    queryFn: () => apiRequest(scoringModelDetailResponseSchema, modelPath(modelId)),
  });
}

/** Katalog variabel yang boleh dipakai kriteria scoring (api-specs 09 §9.2). */
export function useScoringVariables() {
  return useQuery({
    queryKey: ["formula-variables", "SCORING"],
    queryFn: async () =>
      (await apiRequest(formulaVariableListResponseSchema, "/v1/formula-variables?usage=SCORING")).data,
  });
}

/** Perubahan draft memuat ulang detail dan daftar model agar jumlah kriteria dan status ikut berubah. */
function useModelMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: [MODELS_KEY] }) });
}

/** `POST /api/v1/scoring-models/{id}/new-version`: salin versi ACTIVE menjadi draft (api-specs 22 §22.3). */
export const useNewModelVersion = (modelId: string) =>
  useModelMutation(() =>
    apiRequest(scoringModelDetailResponseSchema, `${modelPath(modelId)}/new-version`, { method: "POST" }),
  );

/** Tambah kriteria baru, atau ubah kriteria `criterionId` (api-specs 22 §22.3, AC-37.01 s.d. AC-37.04). */
export const useSaveCriterion = (modelId: string, criterionId: string | undefined) =>
  useModelMutation((body: CriterionInput) =>
    apiRequest(criterionResponseSchema, `${modelPath(modelId)}/criteria${criterionId ? `/${criterionId}` : ""}`, {
      method: criterionId ? "PUT" : "POST",
      body: JSON.stringify(body),
    }),
  );

/** "Submit for Approval" membuat ChangeRequest `SCORING_MODEL` (api-specs 22 §22.4, AC-37.05). */
export const useSubmitModel = (modelId: string) =>
  useModelMutation(() =>
    apiRequest(changeRequestAcceptedSchema, `${modelPath(modelId)}/submit`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  );

/** "Run Test" dengan Loan ID pengajuan contoh; hasilnya tidak disimpan ke pengajuan (api-specs 22 §22.5, AC-38.01). */
export const useTestModel = (modelId: string) =>
  useMutation({
    mutationFn: (body: ScoringModelTestRequest) =>
      apiRequest(scoringModelTestResponseSchema, `${modelPath(modelId)}/test`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
