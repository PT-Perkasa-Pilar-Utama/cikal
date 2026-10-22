import { z } from "zod";
import { dataEnvelope, pageEnvelope } from "../common/envelope.js";
import { id, timestamp } from "../common/scalars.js";

/** Jenis entity checker-maker (api-specs 07 §7.1). */
export const changeRequestEntityTypeSchema = z.enum([
  "ROLE_ACCESS",
  "PRODUCT",
  "PRODUCT_PRICING",
  "ROUTE",
  "DOCUMENT_CHECKLIST",
  "APPROVAL_HIERARCHY",
  "SCORING_MODEL",
  "DECISION_MATRIX",
  "DOCUMENT_NUMBER_FORMAT",
  "INTEGRATION_CONFIG",
]);
export type ChangeRequestEntityType = z.infer<typeof changeRequestEntityTypeSchema>;

export const changeRequestStatusSchema = z.enum(["WAITING_APPROVAL", "REVISE", "APPROVED", "REJECTED"]);
export type ChangeRequestStatus = z.infer<typeof changeRequestStatusSchema>;

/** Daftar dipisah koma di query string, contoh `PRODUCT,PRODUCT_PRICING`. */
const commaList = <T extends z.ZodType<string, string>>(item: T) =>
  z
    .string()
    .transform((value) => value.split(",").map((part) => part.trim()))
    .pipe(z.array(item).min(1));

const userRefSchema = z.object({ id, username: z.string() });

export const changeRequestListItemSchema = z.object({
  id,
  entityType: changeRequestEntityTypeSchema,
  entityId: id.nullable(),
  action: z.enum(["CREATE", "UPDATE"]),
  displayName: z.string(),
  packageSize: z.number().int().min(1),
  status: changeRequestStatusSchema,
  submittedBy: userRefSchema,
  submittedAt: timestamp,
  canReview: z.boolean(),
});

/** `GET /change-requests` (api-specs 07 §7.2). Satu-satunya kolom urut adalah `submittedAt`. */
export const changeRequestListQuerySchema = z.object({
  entityType: commaList(changeRequestEntityTypeSchema),
  status: commaList(changeRequestStatusSchema).default(["WAITING_APPROVAL", "REVISE"]),
  submittedBy: id.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["submittedAt,asc", "submittedAt,desc"]).default("submittedAt,desc"),
});
export type ChangeRequestListQuery = z.infer<typeof changeRequestListQuerySchema>;
export const changeRequestListResponseSchema = pageEnvelope(changeRequestListItemSchema);
export type ChangeRequestListResponse = z.infer<typeof changeRequestListResponseSchema>;

/** `GET /change-requests/{id}` (api-specs 07 §7.3). */
export const changeRequestDetailResponseSchema = dataEnvelope(
  changeRequestListItemSchema.omit({ displayName: true }).extend({
    currentData: z.record(z.string(), z.unknown()).nullable(),
    proposedData: z.record(z.string(), z.unknown()),
    changedFields: z.array(z.string()),
    reviseReason: z.string().nullable(),
    reviewBlockedReason: z.string().nullable(),
  }),
);
export type ChangeRequestDetailResponse = z.infer<typeof changeRequestDetailResponseSchema>;

/** Body approve dan reject (api-specs 07 §7.4, §7.5). */
export const changeRequestReviewRequestSchema = z.strictObject({
  comment: z.string().max(500).optional(),
});
export type ChangeRequestReviewRequest = z.infer<typeof changeRequestReviewRequestSchema>;

/** `data` approve dan reject; `versionNumber` hanya untuk entity berversi (api-specs 07 §7.4). */
export const changeRequestReviewResponseSchema = dataEnvelope(
  z.object({
    id,
    status: z.enum(["APPROVED", "REJECTED"]),
    entityId: id.nullable().optional(),
    versionNumber: z.number().int().optional(),
  }),
);
export type ChangeRequestReviewResponse = z.infer<typeof changeRequestReviewResponseSchema>;
