import { z } from "zod";
import { pageEnvelope, pageQuerySchema } from "../common/envelope.js";
import { businessDate, id, money, timestamp } from "../common/scalars.js";
import { stepCodeSchema } from "../orchestrator/step.js";
import { applicationStatusSchema } from "./application.schema.js";

/** Kolom yang bisa diurutkan di "Application Inquiry" (api-specs 17 §17.1, AC-83.03). */
export const applicationInquirySortFields = [
  "modifiedAt",
  "submittedAt",
  "loanId",
  "fullName",
  "requestedLimit",
] as const;
export type ApplicationInquirySortField = (typeof applicationInquirySortFields)[number];

const sortSchema = z.templateLiteral([z.enum(applicationInquirySortFields), ",", z.enum(["asc", "desc"])]);

/** Query `GET /applications` (api-specs 17 §17.1); `state` adalah kode langkah saat ini (AC-83.02). */
export const applicationInquiryQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  state: stepCodeSchema.optional(),
  status: applicationStatusSchema.optional(),
  productId: id.optional(),
  branchId: id.optional(),
  submittedFrom: businessDate.optional(),
  submittedTo: businessDate.optional(),
  sort: sortSchema.default("modifiedAt,desc"),
});
export type ApplicationInquiryQuery = z.infer<typeof applicationInquiryQuerySchema>;

export const applicationInquiryItemSchema = z.object({
  id,
  loanId: z.string(),
  fullName: z.string(),
  idCardNumberMasked: z.string(),
  productCode: z.string(),
  branchCode: z.string().nullable(),
  requestedLimit: money.nullable(),
  status: applicationStatusSchema,
  state: stepCodeSchema.nullable(),
  submittedAt: timestamp.nullable(),
  modifiedAt: timestamp,
});
export type ApplicationInquiryItem = z.infer<typeof applicationInquiryItemSchema>;

export const applicationInquiryResponseSchema = pageEnvelope(applicationInquiryItemSchema);
export type ApplicationInquiryResponse = z.infer<typeof applicationInquiryResponseSchema>;
