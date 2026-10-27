import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { id, money, timestamp } from "../common/scalars.js";
import { processStatusSchema, stepCodeSchema, stepStatusSchema } from "../orchestrator/step.js";
import { applicationStatusSchema } from "./application.schema.js";
import { applicationFormSectionsSchema } from "./form.schema.js";

/**
 * Tab halaman "Application Detail" (US-84): tab section form, tab "Workflow" (History), dan tab hasil langkah
 * modul. API hanya mengirim tab yang relevan untuk pengajuan (api-specs 12 §12.9 langkah 3, AC-84.03).
 */
export const applicationTabSchema = z.enum([
  "detail",
  "personal",
  "spouse",
  "occupation",
  "business",
  "lkn",
  "collateral",
  "documents",
  "emergency-contact",
  "workflow",
  "dedup",
  "dukcapil",
  "fraud",
  "scoring",
  "credit-bureau",
  "decision",
  "approval",
]);
export type ApplicationTab = z.infer<typeof applicationTabSchema>;

/** Ringkasan di atas tab (AC-84.01); `loanAmount` adalah plafon disetujui, atau limit yang diajukan sebelumnya. */
export const applicationSummarySchema = z.object({
  applicationType: z.string().nullable(),
  loanAmount: money.nullable(),
  tenorApproved: z.number().int().nullable(),
  productCode: z.string(),
  branchCode: z.string().nullable(),
  submittedAt: timestamp.nullable(),
});

export const applicationProcessInstanceSchema = z.object({
  id,
  recontestNumber: z.number().int().min(0),
  status: processStatusSchema,
});

/** Respons `GET /applications/{id}` dan `GET /applications/by-loan-id/{loanId}` (api-specs 12 §12.9, §12.10). */
export const applicationDetailResponseSchema = dataEnvelope(
  z.object({
    id,
    loanId: z.string(),
    status: applicationStatusSchema,
    currentStep: stepCodeSchema.nullable(),
    currentStepStatus: stepStatusSchema.nullable(),
    summary: applicationSummarySchema,
    tabs: z.array(applicationTabSchema),
    sections: applicationFormSectionsSchema,
    processInstances: z.array(applicationProcessInstanceSchema),
  }),
);
export type ApplicationDetailResponse = z.infer<typeof applicationDetailResponseSchema>;
export type ApplicationDetail = ApplicationDetailResponse["data"];
