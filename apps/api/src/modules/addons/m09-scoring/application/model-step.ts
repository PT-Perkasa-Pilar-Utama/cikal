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
import type { CriterionEvaluation } from "../domain/criteria.js";
import { type ModelEvaluation, ModelEvaluator, type ModelOutcome } from "./model-evaluator.js";

const STEP_LABELS: Record<ModelGroup, string> = { RAC: "RAC", SCORING: "Scoring" };
const OUTCOME_LABELS = { PASS: "Pass", REVIEW: "Review", FAIL: "Fail" } as const;

const failure = (errorCategory: "CONFIG" | "BUSINESS_SETUP" | "FORMULA", errorMessage: string): StepResult => ({
  type: "ERROR",
  errorCategory,
  errorMessage,
  retryable: false,
});

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
    private readonly evaluator: ModelEvaluator,
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
    let evaluation: ModelEvaluation;
    try {
      evaluation = await this.evaluator.evaluate(tx, ctx, facts, model, group);
    } catch (error) {
      if (error instanceof DomainError && error.code === "FORMULA_ERROR") return failure("FORMULA", error.message);
      throw error;
    }
    const { evaluations, outcome } = evaluation;
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
    outcome: ModelOutcome,
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
