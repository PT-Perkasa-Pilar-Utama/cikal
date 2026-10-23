import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { id, timestamp } from "../common/scalars.js";
import { processStatusSchema, skipReasonSchema, stepCodeSchema, stepStatusSchema } from "./step.js";

/** Query `GET /applications/{id}/process` (api-specs 13 §13.2); tanpa `processInstanceId` = proses terbaru. */
export const processTimelineQuerySchema = z.object({ processInstanceId: id.optional() });
export type ProcessTimelineQuery = z.infer<typeof processTimelineQuerySchema>;

/** Pelaku langkah: user dengan username, atau sistem untuk langkah otomatis. */
export const stepActorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("USER"), username: z.string() }),
  z.object({ type: z.literal("SYSTEM") }),
]);
export type StepActor = z.infer<typeof stepActorSchema>;

export const timelineStepSchema = z.object({
  stepExecutionId: id,
  stepCode: stepCodeSchema,
  status: stepStatusSchema,
  skipReason: skipReasonSchema.nullable(),
  outcomeCode: z.string().nullable(),
  attempt: z.number().int().min(1),
  startedAt: timestamp.nullable(),
  endedAt: timestamp.nullable(),
  /** Bilangan desimal dalam satuan `AGING_UNIT`, contoh "2" (AC-85.04). */
  aging: z.string().nullable(),
  actor: stepActorSchema.nullable(),
  summary: z.string().nullable(),
  errorMessage: z.string().nullable(),
});
export type TimelineStep = z.infer<typeof timelineStepSchema>;

/** Isi dropdown "Process": proses awal dan setiap recontest (AC-85.03). */
export const processSummarySchema = z.object({
  id,
  recontestNumber: z.number().int().min(0),
  label: z.string(),
  status: processStatusSchema,
});
export type ProcessSummary = z.infer<typeof processSummarySchema>;

/** Respons `GET /applications/{id}/process` (api-specs 13 §13.2). */
export const processTimelineResponseSchema = dataEnvelope(
  z.object({
    applicationId: id,
    loanId: z.string(),
    processes: z.array(processSummarySchema),
    selectedProcessId: id,
    routeVersion: z.number().int().min(1),
    steps: z.array(timelineStepSchema),
  }),
);
export type ProcessTimelineResponse = z.infer<typeof processTimelineResponseSchema>;
