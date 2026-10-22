import { z } from "zod";

export const healthStatusSchema = z.enum(["ok", "degraded", "down"]);
export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const liveResponseSchema = z.object({ status: z.literal("ok") });

const dependencySchema = z.object({
  status: healthStatusSchema,
  latencyMs: z.number().int().optional(),
  error: z.string().optional(),
});

/** Body `GET /api/health/ready` (api-specs 27 §27.2). */
export const readyResponseSchema = z.object({
  status: healthStatusSchema,
  version: z.string(),
  checkedAt: z.iso.datetime(),
  dependencies: z.object({
    database: dependencySchema.extend({ migration: z.string().nullable().optional() }),
    objectStorage: dependencySchema,
    queue: dependencySchema.extend({ pending: z.number().int(), failedLastHour: z.number().int() }).optional(),
    pdfConverter: dependencySchema.optional(),
    integrations: z.record(z.string(), dependencySchema.extend({ provider: z.string() })).optional(),
  }),
});
export type ReadyResponse = z.infer<typeof readyResponseSchema>;
