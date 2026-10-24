import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";

/** Angka model dan skor sebagai string desimal 2 angka, contoh "470.00" (technical-specs 06 §6.11 M09). */
const scoreValue = z.string().regex(/^-?\d{1,10}\.\d{2}$/, "Invalid score value format");

/** Hasil RAC (api-specs 22 §22.5): `FAIL` bila satu kriteria `MANDATORY` tidak terpenuhi. */
export const racOutcomeSchema = z.enum(["PASS", "FAIL"]);
export type RacOutcome = z.infer<typeof racOutcomeSchema>;

/** Hasil Scoring (api-specs 22 §22.5): skor tepat sama dengan Cut Off = `PASS`. */
export const scoringOutcomeSchema = z.enum(["PASS", "REVIEW", "FAIL"]);
export type ScoringOutcome = z.infer<typeof scoringOutcomeSchema>;

export const criterionResultSchema = z.object({
  /** Teks kriteria dari label variabel dan nilai parameter, contoh "Occupation is one of ASN : +50". */
  displayText: z.string(),
  /** Nilai pengajuan yang dinilai; kosong bila datanya tidak ada. */
  actualValue: z.string().nullable(),
  isMet: z.boolean(),
});

export const racResultSchema = z.object({
  modelCode: z.string(),
  versionNumber: z.int(),
  result: racOutcomeSchema,
  /** Kriteria wajib yang gagal dengan nilai aktual dan batasnya (AC-67.02). */
  failedReasons: z.array(z.string()),
  criteria: z.array(criterionResultSchema),
});
export type RacResult = z.infer<typeof racResultSchema>;

export const scoringResultSchema = z.object({
  modelCode: z.string(),
  versionNumber: z.int(),
  constant: scoreValue,
  cutOff: scoreValue,
  totalScore: scoreValue,
  result: scoringOutcomeSchema,
  criteria: z.array(criterionResultSchema.extend({ appliedWeight: scoreValue.nullable() })),
});
export type ScoringResult = z.infer<typeof scoringResultSchema>;

/** Langkah RAC dan SCORING satu proses; langkah yang belum berjalan atau dilewati bernilai `null` (api-specs 22 §22.6). */
export const applicationScoringSchema = z.object({
  rac: racResultSchema.nullable(),
  scoring: scoringResultSchema.nullable(),
});
export type ApplicationScoring = z.infer<typeof applicationScoringSchema>;

export const applicationScoringResponseSchema = dataEnvelope(applicationScoringSchema);
export type ApplicationScoringResponse = z.infer<typeof applicationScoringResponseSchema>;
