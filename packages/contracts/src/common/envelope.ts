import { z } from "zod";

export const pageMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PageMeta = z.infer<typeof pageMetaSchema>;

/** Query paging dan sorting standar (api-specs 01 §1.6). */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[A-Za-z]+,(asc|desc)$/)
    .optional(),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

export const dataEnvelope = <T extends z.ZodType>(data: T) =>
  z.object({
    data,
    message: z.string().optional(),
  });

export const pageEnvelope = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    meta: pageMetaSchema,
  });

export const errorDetailSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});

/** Format error seragam API-04 (api-specs 01 §1.5). */
export const errorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(errorDetailSchema),
  correlationId: z.string(),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** Body 202 untuk data master yang diajukan ke checker-maker (api-specs 01 §1.8). */
export const changeRequestAcceptedSchema = dataEnvelope(
  z.object({
    changeRequestId: z.uuid(),
    entityType: z.string(),
    entityId: z.uuid().nullable(),
    status: z.literal("WAITING_APPROVAL"),
    versionNumber: z.number().int().optional(),
  }),
);
export type ChangeRequestAccepted = z.infer<typeof changeRequestAcceptedSchema>;
