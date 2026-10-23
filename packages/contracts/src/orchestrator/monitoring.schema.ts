import { z } from "zod";
import { dataEnvelope, pageEnvelope } from "../common/envelope.js";
import { id, timestamp } from "../common/scalars.js";
import { errorCategorySchema, stepCodeSchema, stepStatusSchema } from "./step.js";

const REQUIRED = "This field is required";

/** Status langkah saat ini yang tampil di Process Monitoring (api-specs 13 §13.3). */
export const monitoringStatusSchema = z.enum(["ERROR", "WAITING_HUMAN", "WAITING_EXTERNAL", "RUNNING"]);
export type MonitoringStatus = z.infer<typeof monitoringStatusSchema>;

/**
 * Query `GET /process-monitoring` (api-specs 13 §13.3). `q` mencari Loan ID; pencarian nama ikut data debitur di
 * kartu BE-S3-01, filter `branchId` ikut tabel cabang di kartu TL-S5-04.
 */
export const processMonitoringQuerySchema = z.object({
  status: monitoringStatusSchema.optional(),
  stepCode: stepCodeSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["stepStartedAt,asc", "stepStartedAt,desc", "loanId,asc", "loanId,desc"]).default("stepStartedAt,asc"),
});
export type ProcessMonitoringQuery = z.infer<typeof processMonitoringQuerySchema>;

export const monitoringStepSchema = z.object({
  stepExecutionId: id,
  stepCode: stepCodeSchema,
  status: monitoringStatusSchema,
  attempt: z.number().int().min(1),
  errorCategory: errorCategorySchema.nullable(),
  errorMessage: z.string().nullable(),
  startedAt: timestamp.nullable(),
});
export type MonitoringStep = z.infer<typeof monitoringStepSchema>;

export const processMonitoringItemSchema = z.object({
  applicationId: id,
  loanId: z.string(),
  /** `null` sampai data debitur pengajuan dibangun di kartu BE-S3-01. */
  fullName: z.string().nullable(),
  /** `null` sampai tabel cabang dibangun di kartu TL-S5-04. */
  branchCode: z.string().nullable(),
  processInstanceId: id,
  currentStep: monitoringStepSchema,
});
export type ProcessMonitoringItem = z.infer<typeof processMonitoringItemSchema>;

/** `GET /process-monitoring` (api-specs 13 §13.3). */
export const processMonitoringResponseSchema = pageEnvelope(processMonitoringItemSchema);
export type ProcessMonitoringResponse = z.infer<typeof processMonitoringResponseSchema>;

/** `POST /processes/{processInstanceId}/steps/{stepExecutionId}/retry` berhasil (api-specs 13 §13.4). */
export const stepRetryResponseSchema = dataEnvelope(
  z.object({
    stepExecutionId: id,
    stepCode: stepCodeSchema,
    status: stepStatusSchema,
    attempt: z.number().int().min(1),
    outcomeCode: z.string().nullable(),
  }),
);
export type StepRetryResponse = z.infer<typeof stepRetryResponseSchema>;

/** Body `POST /processes/{processInstanceId}/finish` (api-specs 13 §13.5). */
export const processFinishRequestSchema = z.strictObject({
  reason: z.string({ error: REQUIRED }).trim().min(1, { error: REQUIRED }).max(500),
});
export type ProcessFinishRequest = z.infer<typeof processFinishRequestSchema>;

export const processFinishResponseSchema = dataEnvelope(
  z.object({ processInstanceId: id, applicationStatus: z.literal("FINISHED_CANCELLED") }),
);
export type ProcessFinishResponse = z.infer<typeof processFinishResponseSchema>;
