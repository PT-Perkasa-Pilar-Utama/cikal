import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";
import { stepCodeSchema } from "../orchestrator/step.js";
import { decisionOutcomeSchema, moduleOutcomesSchema } from "./decision-matrix.schema.js";

/** Query `GET /applications/{id}/decision` (api-specs 24 §24.4). */
export const applicationDecisionQuerySchema = z.object({ processInstanceId: id.optional() });
export type ApplicationDecisionQuery = z.infer<typeof applicationDecisionQuerySchema>;

const { shape } = moduleOutcomesSchema;

/** Hasil keenam modul yang dipakai keputusan, dengan nama pendek api-specs 24 §24.4. */
export const decisionOutcomesSchema = z.object({
  dedup: shape.dedupOutcome,
  dukcapil: shape.dukcapilOutcome,
  fraud: shape.fraudOutcome,
  rac: shape.racOutcome,
  scoring: shape.scoringOutcome,
  creditBureau: shape.creditBureauOutcome,
});
export type DecisionOutcomes = z.infer<typeof decisionOutcomesSchema>;

export const applicationDecisionSchema = z.object({
  decisionOutcome: decisionOutcomeSchema,
  outcomes: decisionOutcomesSchema,
  /** Baris Decision Matrix dan prioritasnya saat keputusan dibuat; kosong untuk NotGo default (AC-36.03). */
  matchedRow: z.object({ id, priority: z.int() }).nullable(),
  description: z.string().nullable(),
  /** Langkah sesudah DECISION untuk Go, contoh `SIKP` atau `APPROVAL` (AC-69.01); kosong untuk NotGo. */
  nextStep: stepCodeSchema.nullable(),
});
export type ApplicationDecision = z.infer<typeof applicationDecisionSchema>;

export const applicationDecisionResponseSchema = dataEnvelope(applicationDecisionSchema);
export type ApplicationDecisionResponse = z.infer<typeof applicationDecisionResponseSchema>;
