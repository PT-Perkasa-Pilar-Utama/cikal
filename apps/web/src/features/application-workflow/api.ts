import {
  applicationCreditBureauResponseSchema,
  applicationDecisionResponseSchema,
  applicationDedupResponseSchema,
  applicationDukcapilResponseSchema,
  applicationFraudResponseSchema,
  applicationScoringResponseSchema,
  processTimelineResponseSchema,
} from "@cikal/contracts";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { apiRequest } from "../../lib/api/client";

const WORKFLOW_KEY = "application-workflow";

/** Sumber data tab Workflow; semuanya menerima `processInstanceId` opsional (api-specs 13 §13.2, 19 s.d. 24). */
function useProcessResource<T extends z.ZodType>(
  schema: T,
  resource: string,
  applicationId: string,
  processInstanceId: string | undefined,
) {
  const query = processInstanceId ? `?${new URLSearchParams({ processInstanceId })}` : "";
  return useQuery({
    queryKey: [WORKFLOW_KEY, applicationId, resource, processInstanceId],
    queryFn: () => apiRequest(schema, `/v1/applications/${applicationId}/${resource}${query}`),
  });
}

/** `GET /api/v1/applications/{id}/process`; tanpa `processInstanceId` server memilih proses terbaru (api-specs 13 §13.2). */
export const useProcessTimeline = (applicationId: string, processInstanceId: string | undefined) =>
  useProcessResource(processTimelineResponseSchema, "process", applicationId, processInstanceId);

/** `GET /api/v1/applications/{id}/dedup` (api-specs 19 §19.2). */
export const useDedupResult = (applicationId: string, processInstanceId: string) =>
  useProcessResource(applicationDedupResponseSchema, "dedup", applicationId, processInstanceId);

/** `GET /api/v1/applications/{id}/dukcapil` (api-specs 20 §20.2). */
export const useDukcapilResult = (applicationId: string, processInstanceId: string) =>
  useProcessResource(applicationDukcapilResponseSchema, "dukcapil", applicationId, processInstanceId);

/** `GET /api/v1/applications/{id}/fraud` (api-specs 21 §21.2). */
export const useFraudResult = (applicationId: string, processInstanceId: string) =>
  useProcessResource(applicationFraudResponseSchema, "fraud", applicationId, processInstanceId);

/** `GET /api/v1/applications/{id}/scoring`: hasil RAC dan Scoring satu proses (api-specs 22 §22.6). */
export const useScoringResult = (applicationId: string, processInstanceId: string) =>
  useProcessResource(applicationScoringResponseSchema, "scoring", applicationId, processInstanceId);

/** `GET /api/v1/applications/{id}/credit-bureau` (api-specs 23 §23.3). */
export const useCreditBureauResult = (applicationId: string, processInstanceId: string) =>
  useProcessResource(applicationCreditBureauResponseSchema, "credit-bureau", applicationId, processInstanceId);

/** `GET /api/v1/applications/{id}/decision` (api-specs 24 §24.4). */
export const useDecisionResult = (applicationId: string, processInstanceId: string) =>
  useProcessResource(applicationDecisionResponseSchema, "decision", applicationId, processInstanceId);
