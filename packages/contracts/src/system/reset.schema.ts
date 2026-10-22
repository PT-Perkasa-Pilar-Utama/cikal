import { z } from "zod";

export const resetSeedSchema = z.enum(["dev", "qa"]);
export type ResetSeed = z.infer<typeof resetSeedSchema>;

/** Body `POST /api/admin/reset-state` (api-specs 27 §27.4); body atau `seed` kosong memakai `DEFAULT_RESET_SEED`. */
export const resetStateRequestSchema = z.strictObject({ seed: resetSeedSchema.optional() }).default({});
export type ResetStateRequest = z.infer<typeof resetStateRequestSchema>;

export const resetStateResponseSchema = z.object({
  seed: resetSeedSchema,
  durationMs: z.number().int().nonnegative(),
  migrationsApplied: z.number().int().nonnegative(),
  tenantsSeeded: z.array(z.string()),
  bucketObjectsDeleted: z.number().int().nonnegative(),
});
export type ResetStateResponse = z.infer<typeof resetStateResponseSchema>;
