import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";

/** Query `GET /insurances` (api-specs 06 §6.2). */
export const insuranceListQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});
export type InsuranceListQuery = z.infer<typeof insuranceListQuerySchema>;

export const insuranceSchema = z.object({
  id,
  insuranceCode: z.string(),
  insuranceName: z.string(),
  isActive: z.boolean(),
});
export type Insurance = z.infer<typeof insuranceSchema>;

/** Dropdown "Insurance" step Application, tanpa paging. */
export const insuranceListResponseSchema = dataEnvelope(z.array(insuranceSchema));
export type InsuranceListResponse = z.infer<typeof insuranceListResponseSchema>;
