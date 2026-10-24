import { z } from "zod";
import { dataEnvelope, pageEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";

/** Pesan Decision Matrix (api-specs 24 §24.2, §24.3); "This combination already exists" teks usulan engineering. */
export const DECISION_MATRIX_MESSAGES = {
  rowExists: "This combination already exists",
  outcomeRequired: "Select an outcome for every module",
  noMatchingRule: "No matching rule, default decision applied",
} as const;

/** Nilai hasil modul tanpa `ANY` (api-specs 24 §24.1); dipakai simulasi dan keputusan pengajuan. */
export const moduleOutcomeValues = {
  dedupOutcome: ["MATCH", "UNMATCH", "SKIP"],
  dukcapilOutcome: ["PASSED", "SKIP"],
  fraudOutcome: ["CLEAN", "SUSPICIOUS_CLEARED", "SKIP"],
  racOutcome: ["PASS", "FAIL", "SKIP"],
  scoringOutcome: ["PASS", "REVIEW", "FAIL", "SKIP"],
  creditBureauOutcome: ["COLLECT_1", "COLLECT_2", "COLLECT_3", "COLLECT_4", "COLLECT_5", "NO_HISTORY", "SKIP"],
} as const;
export type MatrixColumn = keyof typeof moduleOutcomeValues;
export const MATRIX_COLUMNS = [
  "dedupOutcome",
  "dukcapilOutcome",
  "fraudOutcome",
  "racOutcome",
  "scoringOutcome",
  "creditBureauOutcome",
] as const satisfies readonly MatrixColumn[];

/** Nilai `[ANY]` yang cocok untuk semua hasil (AC-36.05). */
export const ANY_OUTCOME = "ANY";

const withAny = <T extends readonly string[]>(values: T) => z.enum([...values, ANY_OUTCOME]);

export const decisionOutcomeSchema = z.enum(["GO", "NOTGO"]);
export type DecisionOutcome = z.infer<typeof decisionOutcomeSchema>;

/** Enam kolom satu baris matrix, termasuk `ANY`. */
export const matrixCombinationSchema = z.object({
  dedupOutcome: withAny(moduleOutcomeValues.dedupOutcome),
  dukcapilOutcome: withAny(moduleOutcomeValues.dukcapilOutcome),
  fraudOutcome: withAny(moduleOutcomeValues.fraudOutcome),
  racOutcome: withAny(moduleOutcomeValues.racOutcome),
  scoringOutcome: withAny(moduleOutcomeValues.scoringOutcome),
  creditBureauOutcome: withAny(moduleOutcomeValues.creditBureauOutcome),
});
export type MatrixCombination = z.infer<typeof matrixCombinationSchema>;

/** Hasil enam modul satu pengajuan atau satu simulasi, tanpa `ANY`. */
export const moduleOutcomesSchema = z.object({
  dedupOutcome: z.enum(moduleOutcomeValues.dedupOutcome),
  dukcapilOutcome: z.enum(moduleOutcomeValues.dukcapilOutcome),
  fraudOutcome: z.enum(moduleOutcomeValues.fraudOutcome),
  racOutcome: z.enum(moduleOutcomeValues.racOutcome),
  scoringOutcome: z.enum(moduleOutcomeValues.scoringOutcome),
  creditBureauOutcome: z.enum(moduleOutcomeValues.creditBureauOutcome),
});
export type ModuleOutcomes = z.infer<typeof moduleOutcomesSchema>;

/** Body `PUT /decision-matrix/rows/{id}` dan `POST /decision-matrix/rows` (api-specs 24 §24.2). */
export const decisionMatrixRowInputSchema = matrixCombinationSchema.extend({
  decisionOutcome: decisionOutcomeSchema,
  priority: z.int().min(1),
  description: z.string().trim().max(200).nullable().optional(),
});
export type DecisionMatrixRowInput = z.infer<typeof decisionMatrixRowInputSchema>;

/** `newData` ChangeRequest `DECISION_MATRIX`. */
export const decisionMatrixDataSchema = decisionMatrixRowInputSchema.extend({
  description: z.string().nullable(),
});
export type DecisionMatrixData = z.infer<typeof decisionMatrixDataSchema>;

/** Query `GET /decision-matrix` (api-specs 24 §24.2); urutan selalu `priority` naik. */
export const decisionMatrixListQuerySchema = z.object({
  decisionOutcome: decisionOutcomeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type DecisionMatrixListQuery = z.infer<typeof decisionMatrixListQuerySchema>;

export const decisionMatrixRowSchema = decisionMatrixDataSchema.extend({ id, hasPendingChange: z.boolean() });
export type DecisionMatrixRow = z.infer<typeof decisionMatrixRowSchema>;

export const decisionMatrixListResponseSchema = pageEnvelope(decisionMatrixRowSchema);
export type DecisionMatrixListResponse = z.infer<typeof decisionMatrixListResponseSchema>;

/**
 * Body `POST /decision-matrix/simulate` (api-specs 24 §24.3). Kolom boleh kosong di skema karena kolom kosong
 * dijawab `422 OUTCOME_REQUIRED` (AC-36.04), bukan `400`.
 */
export const decisionSimulationRequestSchema = z.strictObject({
  ...moduleOutcomesSchema.partial().shape,
  useMatrix: z.enum(["ACTIVE", "PENDING"]).default("ACTIVE"),
});
export type DecisionSimulationRequest = z.infer<typeof decisionSimulationRequestSchema>;

export const matchedMatrixRowSchema = matrixCombinationSchema.extend({ id, priority: z.int() });

export const decisionSimulationSchema = z.object({
  decisionOutcome: decisionOutcomeSchema,
  matchedRow: matchedMatrixRowSchema.nullable(),
  note: z.string().nullable(),
});
export type DecisionSimulation = z.infer<typeof decisionSimulationSchema>;

export const decisionSimulationResponseSchema = dataEnvelope(decisionSimulationSchema);
export type DecisionSimulationResponse = z.infer<typeof decisionSimulationResponseSchema>;

/** Label UI kolom dan nilai matrix (api-specs 24 §24.1). */
export const MATRIX_COLUMN_LABELS = {
  dedupOutcome: "Dedup",
  dukcapilOutcome: "Dukcapil",
  fraudOutcome: "Fraud",
  racOutcome: "RAC",
  scoringOutcome: "Scoring",
  creditBureauOutcome: "SLIK",
} as const satisfies Record<MatrixColumn, string>;

export const MATRIX_VALUE_LABELS: Readonly<Record<string, string>> = {
  MATCH: "Match",
  UNMATCH: "UnMatch",
  PASSED: "Passed",
  CLEAN: "Clean",
  SUSPICIOUS_CLEARED: "Suspicious cleared",
  PASS: "Pass",
  REVIEW: "Review",
  FAIL: "Fail",
  COLLECT_1: "Collect 1",
  COLLECT_2: "Collect 2",
  COLLECT_3: "Collect 3",
  COLLECT_4: "Collect 4",
  COLLECT_5: "Collect 5",
  NO_HISTORY: "No history",
  SKIP: "Skip",
  ANY: "[ANY]",
  GO: "Go",
  NOTGO: "NotGo",
};
