import {
  type DecisionOutcomes,
  MATRIX_COLUMNS,
  type MatrixColumn,
  type ModuleOutcomes,
  moduleOutcomesSchema,
  type StepCode,
} from "@cikal/contracts";

/** Langkah yang hasilnya dibaca Decision Matrix (api-specs 24 §24.1). */
const STEP_COLUMNS = {
  dedupOutcome: "DEDUP",
  dukcapilOutcome: "DUKCAPIL",
  fraudOutcome: "FRAUD",
  racOutcome: "RAC",
  scoringOutcome: "SCORING",
  creditBureauOutcome: "CREDIT_BUREAU",
} as const satisfies Record<MatrixColumn, StepCode>;

/** Langkah yang tidak tercatat di proses dianggap dilewati (AC-69.03). */
const NOT_RUN = "SKIP";

export type OutcomeMapping = { ok: true; outcomes: ModuleOutcomes } | { ok: false; message: string };

/**
 * Hasil keenam langkah dari `orchestrator.outcomes` menjadi kombinasi matrix. `outcomeCode` langkah wajib salah satu
 * nilai api-specs 24 §24.1; nilai lain berarti modul langkah dan Decision Matrix tidak sepakat (konfigurasi).
 */
export function moduleOutcomesFrom(stepOutcomes: Partial<Record<StepCode, string>>): OutcomeMapping {
  const candidate: Record<MatrixColumn, string> = {
    dedupOutcome: stepOutcomes.DEDUP ?? NOT_RUN,
    dukcapilOutcome: stepOutcomes.DUKCAPIL ?? NOT_RUN,
    fraudOutcome: stepOutcomes.FRAUD ?? NOT_RUN,
    racOutcome: stepOutcomes.RAC ?? NOT_RUN,
    scoringOutcome: stepOutcomes.SCORING ?? NOT_RUN,
    creditBureauOutcome: stepOutcomes.CREDIT_BUREAU ?? NOT_RUN,
  };
  const parsed = moduleOutcomesSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, outcomes: parsed.data };
  const column =
    MATRIX_COLUMNS.find((name) => !moduleOutcomesSchema.shape[name].safeParse(candidate[name]).success) ??
    "dedupOutcome";
  return {
    ok: false,
    message: `Step ${STEP_COLUMNS[column]} outcome ${candidate[column]} is not a Decision Matrix value`,
  };
}

/** Nama pendek respons `GET /applications/{id}/decision` (api-specs 24 §24.4). */
export function shortOutcomes(outcomes: ModuleOutcomes): DecisionOutcomes {
  return {
    dedup: outcomes.dedupOutcome,
    dukcapil: outcomes.dukcapilOutcome,
    fraud: outcomes.fraudOutcome,
    rac: outcomes.racOutcome,
    scoring: outcomes.scoringOutcome,
    creditBureau: outcomes.creditBureauOutcome,
  };
}
