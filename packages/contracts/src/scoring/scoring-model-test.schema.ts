import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";
import { criterionResultSchema, scoreValue, scoringOutcomeSchema } from "./application-scoring.schema.js";
import { modelGroupSchema } from "./scoring-models.schema.js";

/** Body `POST /scoring-models/{id}/test` (api-specs 22 §22.5). */
export const scoringModelTestRequestSchema = z.strictObject({ sampleLoanId: z.string().trim().min(1).max(30) });
export type ScoringModelTestRequest = z.infer<typeof scoringModelTestRequestSchema>;

/**
 * Hasil "Run Test" (AC-38.01): RAC tanpa konstanta, Cut Off, dan skor; hasil RAC hanya `PASS` atau `FAIL`. Tidak
 * disimpan ke pengajuan contoh.
 */
export const scoringModelTestSchema = z.object({
  sampleLoanId: z.string(),
  modelGroup: modelGroupSchema,
  constant: scoreValue.nullable(),
  cutOff: scoreValue.nullable(),
  totalScore: scoreValue.nullable(),
  result: scoringOutcomeSchema,
  criteria: z.array(criterionResultSchema.extend({ criterionId: id, appliedWeight: scoreValue.nullable() })),
});
export type ScoringModelTest = z.infer<typeof scoringModelTestSchema>;

export const scoringModelTestResponseSchema = dataEnvelope(scoringModelTestSchema);
export type ScoringModelTestResponse = z.infer<typeof scoringModelTestResponseSchema>;
