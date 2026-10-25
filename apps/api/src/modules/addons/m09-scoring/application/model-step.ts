import type { StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationFactsReader } from "../../../core/application/index.js";
import { ProductCodes } from "../../../core/product/index.js";
import type { ModelGroup } from "../db/schema.js";
import { type ActiveModel, ScoringModelsRepository } from "../db/scoring-models.repository.js";
import { ScoringResultsRepository } from "../db/scoring-results.repository.js";
import { type CriterionEvaluation, evaluateCriterion, type VariableValues } from "../domain/criteria.js";
import { racOutcome, scoringOutcome } from "../domain/model-outcome.js";
import { VariableValuesResolver } from "./variable-values.js";

const STEP_LABELS: Record<ModelGroup, string> = { RAC: "RAC", SCORING: "Scoring" };
const OUTCOME_LABELS = { PASS: "Pass", REVIEW: "Review", FAIL: "Fail" } as const;

const failure = (errorCategory: "CONFIG" | "BUSINESS_SETUP" | "FORMULA", errorMessage: string): StepResult => ({
  type: "ERROR",
  errorCategory,
  errorMessage,
  retryable: false,
});

/** Kode variabel yang dibaca kriteria model, termasuk variabel di sisi kanan perbandingan. */
function variablesOf(model: ActiveModel): Set<string> {
  return new Set(
    model.criteria.flatMap((criterion) =>
      criterion.value.type === "VARIABLE" ? [criterion.fieldCode, criterion.value.variableCode] : [criterion.fieldCode],
    ),
  );
}

interface Outcome {
  outcome: "PASS" | "REVIEW" | "FAIL";
  totalScore: string | null;
  failedReasons: string[];
}

/** RAC dinilai kriteria wajib; Scoring menjumlahkan bobot ke konstanta dan dibandingkan dengan Cut Off. */
function outcomeOf(group: ModelGroup, model: ActiveModel, evaluations: CriterionEvaluation[]): Outcome | string {
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
 * Langkah RAC dan SCORING M09 (api-specs 22 §22.5, §22.6): model ACTIVE kelompoknya untuk produk pengajuan,
 * kriteria dinilai dengan nilai pengajuan, lalu hasil dan rinciannya disimpan per proses. Hasil apa pun lanjut ke
 * langkah berikutnya; Decision Matrix yang memutuskan Go atau NotGo (api-specs 24 §24.1).
 */
@Injectable()
export class ModelStep {
  constructor(
    private readonly facts: ApplicationFactsReader,
    private readonly productCodes: ProductCodes,
    private readonly models: ScoringModelsRepository,
    private readonly results: ScoringResultsRepository,
    private readonly variables: VariableValuesResolver,
  ) {}

  async run(tx: Tx, ctx: StepContext, group: ModelGroup): Promise<StepResult> {
    const facts = await this.facts.of(tx, ctx.applicationId);
    if (!facts) return failure("CONFIG", "Application data is not available");
    const model = await this.models.activeFor(tx, facts.productId, group);
    if (!model) {
      const productName = (await this.productCodes.name(tx, facts.productId)) ?? facts.productId;
      const kind = group === "SCORING" ? "scoring" : "RAC";
      return failure("BUSINESS_SETUP", `No active ${kind} model for product ${productName}`);
    }
    const codes = variablesOf(model);
    let values: VariableValues;
    try {
      values = await this.variables.values(ctx, facts, codes);
    } catch (error) {
      if (error instanceof DomainError && error.code === "FORMULA_ERROR") return failure("FORMULA", error.message);
      throw error;
    }
    const choiceLabel = await this.variables.choiceLabels(tx, codes);
    const evaluations = model.criteria.map((criterion) => evaluateCriterion(criterion, values, choiceLabel));
    const outcome = outcomeOf(group, model, evaluations);
    if (typeof outcome === "string") return failure("BUSINESS_SETUP", outcome);
    await this.save(tx, ctx, group, model, outcome, evaluations);
    const summary = `${STEP_LABELS[group]} = ${OUTCOME_LABELS[outcome.outcome]}`;
    return { type: "CONTINUE", outcomeCode: outcome.outcome, summary };
  }

  private save(
    tx: Tx,
    ctx: StepContext,
    group: ModelGroup,
    model: ActiveModel,
    outcome: Outcome,
    evaluations: readonly CriterionEvaluation[],
  ): Promise<void> {
    return this.results.replace(
      tx,
      {
        id: uuidv7(),
        tenantId: ctx.tenantId,
        applicationId: ctx.applicationId,
        processInstanceId: ctx.processInstanceId,
        modelId: model.id,
        modelGroup: group,
        totalScore: outcome.totalScore,
        outcome: outcome.outcome,
        failedReasons: outcome.failedReasons,
      },
      evaluations.map((evaluation, index) => ({
        id: uuidv7(),
        criterionId: evaluation.criterionId,
        sortOrder: index + 1,
        displayText: evaluation.displayText,
        actualValue: evaluation.actualValue,
        isMet: evaluation.isMet,
        appliedWeight: evaluation.appliedWeight,
      })),
    );
  }
}
