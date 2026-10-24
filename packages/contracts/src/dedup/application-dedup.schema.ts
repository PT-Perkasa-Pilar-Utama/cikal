import { z } from "zod";
import { applicationStatusSchema } from "../application/application.schema.js";
import { id, score, timestamp } from "../common/scalars.js";
import { stepResultEnvelope } from "../orchestrator/step-result.schema.js";

/** Hasil langkah DEDUP (technical-specs 06 §6.11 M06); `DUPLICATE_IN_FLIGHT` hanya ada di hasil, bukan di matrix. */
export const dedupOutcomeSchema = z.enum(["MATCH", "UNMATCH", "REVIEW", "SKIP", "DUPLICATE_IN_FLIGHT"]);
export type DedupOutcome = z.infer<typeof dedupOutcomeSchema>;

/** Hasil banding satu field identitas kandidat. */
export const dedupFieldResultSchema = z.enum(["MATCH", "UNMATCH"]);
export type DedupFieldResult = z.infer<typeof dedupFieldResultSchema>;

/** Kondisi satu kolom Dedup Matrix: `ANY` cocok untuk semua hasil, `FUZZY` hanya untuk kolom nama (AC-59.01). */
export const dedupExactConditionSchema = z.enum(["MATCH", "UNMATCH", "ANY"]);
export const dedupFuzzyConditionSchema = z.enum(["MATCH", "UNMATCH", "FUZZY", "ANY"]);

export const applicationDedupSchema = z.object({
  outcome: dedupOutcomeSchema,
  ranAt: timestamp,
  matchedApplication: z.object({ id, loanId: z.string() }).nullable(),
  matrixRow: z
    .object({
      id,
      priority: z.int(),
      nik: dedupExactConditionSchema,
      fullNameId: dedupFuzzyConditionSchema,
      dob: dedupExactConditionSchema,
      pob: dedupExactConditionSchema,
      motherMaidenName: dedupFuzzyConditionSchema,
    })
    .nullable(),
  candidates: z.array(
    z.object({
      loanId: z.string(),
      status: applicationStatusSchema,
      nikResult: dedupFieldResultSchema,
      dobResult: dedupFieldResultSchema,
      pobResult: dedupFieldResultSchema,
      nameScore: score,
      motherNameScore: score,
    }),
  ),
  /** Keputusan Verifikator dari layar review (backlog US-60); selalu kosong di POC. */
  review: z.null(),
});
export type ApplicationDedup = z.infer<typeof applicationDedupSchema>;

export const applicationDedupResponseSchema = stepResultEnvelope(applicationDedupSchema);
export type ApplicationDedupResponse = z.infer<typeof applicationDedupResponseSchema>;
