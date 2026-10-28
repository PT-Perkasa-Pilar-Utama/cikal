import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { ApplicationFacts } from "../../../core/application/index.js";
import type { ModelGroup } from "../db/schema.js";
import type { ActiveModel } from "../db/scoring-models.repository.js";
import { type CriterionEvaluation, evaluateCriterion } from "../domain/criteria.js";
import { racOutcome, scoringOutcome } from "../domain/model-outcome.js";
import { type ValueContext, VariableValuesResolver } from "./variable-values.js";

/** Model yang dinilai: versi ACTIVE untuk langkah proses, atau versi apa pun untuk uji model. */
export type EvaluatedModel = Pick<ActiveModel, "modelCode" | "constant" | "cutOff" | "reviewLowerBound" | "criteria">;

export interface ModelOutcome {
  outcome: "PASS" | "REVIEW" | "FAIL";
  totalScore: string | null;
  failedReasons: string[];
}

/** Hasil penilaian, atau pesan bila model Scoring tidak punya konstanta atau Cut Off. */
export interface ModelEvaluation {
  evaluations: CriterionEvaluation[];
  outcome: ModelOutcome | string;
}

/** Kode variabel yang dibaca kriteria model, termasuk variabel di sisi kanan perbandingan. */
function variablesOf(model: EvaluatedModel): Set<string> {
  return new Set(
    model.criteria.flatMap((criterion) =>
      criterion.value.type === "VARIABLE" ? [criterion.fieldCode, criterion.value.variableCode] : [criterion.fieldCode],
    ),
  );
}

/** RAC dinilai kriteria wajib; Scoring menjumlahkan bobot ke konstanta dan dibandingkan dengan Cut Off. */
function outcomeOf(
  group: ModelGroup,
  model: EvaluatedModel,
  evaluations: CriterionEvaluation[],
): ModelOutcome | string {
  if (group === "RAC") {
    const rac = racOutcome(evaluations);
    return { outcome: rac.result, totalScore: null, failedReasons: rac.failedReasons };
  }
  if (model.constant === null || model.cutOff === null) return `Scoring model ${model.modelCode} has no cut off`;
  const scored = scoringOutcome(
    { constant: model.constant, cutOff: model.cutOff, reviewLowerBound: model.reviewLowerBound },
    evaluations,
  );
  return { outcome: scored.result, totalScore: scored.totalScore, failedReasons: [] };
}

/**
 * Penilaian kriteria model terhadap satu pengajuan (api-specs 22 §22.5), dipakai langkah RAC dan SCORING serta
 * uji model. `FORMULA_ERROR` dari rumus rasio angsuran diteruskan ke pemanggil.
 */
@Injectable()
export class ModelEvaluator {
  constructor(private readonly variables: VariableValuesResolver) {}

  async evaluate(
    tx: Tx,
    ctx: ValueContext,
    facts: ApplicationFacts,
    model: EvaluatedModel,
    group: ModelGroup,
  ): Promise<ModelEvaluation> {
    const codes = variablesOf(model);
    const values = await this.variables.values(ctx, facts, codes);
    const choiceLabel = await this.variables.choiceLabels(tx, codes);
    const evaluations = model.criteria.map((criterion) => evaluateCriterion(criterion, values, choiceLabel));
    return { evaluations, outcome: outcomeOf(group, model, evaluations) };
  }
}
