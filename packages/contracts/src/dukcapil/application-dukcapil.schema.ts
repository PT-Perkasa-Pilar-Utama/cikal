import { z } from "zod";
import { percent, score } from "../common/scalars.js";
import { stepResultEnvelope } from "../orchestrator/step-result.schema.js";

/** Hasil langkah DUKCAPIL (technical-specs 06 §6.11 M07). */
export const dukcapilOutcomeSchema = z.enum(["PASSED", "REVIEW", "FAILED", "SKIP"]);
export type DukcapilOutcome = z.infer<typeof dukcapilOutcomeSchema>;

/** Banding tanggal atau tempat lahir dengan data Dukcapil. */
export const dukcapilMatchStatusSchema = z.enum(["MATCH", "NOT_MATCH"]);
export type DukcapilMatchStatus = z.infer<typeof dukcapilMatchStatusSchema>;

/** Bobot (jumlah 100) dan ambang inklusif DukcapilRule saat langkah berjalan (AC-61.01). */
export const dukcapilRuleSnapshotSchema = z.object({
  nameWeight: percent,
  motherNameWeight: percent,
  passedThreshold: score,
  reviewThreshold: score,
});
export type DukcapilRuleSnapshot = z.infer<typeof dukcapilRuleSnapshotSchema>;

export const applicationDukcapilSchema = z.object({
  outcome: dukcapilOutcomeSchema,
  recordFound: z.boolean(),
  /** Kosong untuk `SKIP`, karena penyedia tidak dipanggil (TRM_DKC_008). */
  providerCode: z.string().nullable(),
  providerReference: z.string().nullable(),
  dobStatus: dukcapilMatchStatusSchema.nullable(),
  pobStatus: dukcapilMatchStatusSchema.nullable(),
  fullNameScore: score.nullable(),
  motherNameScore: score.nullable(),
  /** Kosong bila skor tidak dihitung: tanggal atau tempat lahir beda, NIK tidak ditemukan, atau `SKIP`. */
  finalScore: score.nullable(),
  rule: dukcapilRuleSnapshotSchema,
  /** Keputusan Verifikator dan Supervisor (backlog US-62, US-63); selalu kosong di POC. */
  reviews: z.array(z.never()),
});
export type ApplicationDukcapil = z.infer<typeof applicationDukcapilSchema>;

export const applicationDukcapilResponseSchema = stepResultEnvelope(applicationDukcapilSchema);
export type ApplicationDukcapilResponse = z.infer<typeof applicationDukcapilResponseSchema>;
