import { SCORING_MODEL_MESSAGES, type ScoringModelTestRequest, type ScoringModelTestResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationFactsReader, ApplicationProcess } from "../../../core/application/index.js";
import { ProductTerms } from "../../../core/product/index.js";
import { ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { ModelEvaluator } from "./model-evaluator.js";

const applicationNotFound = () => new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);

/**
 * "Run Test" (api-specs 22 §22.5): versi model apa pun dinilai dengan data pengajuan contoh dan parameter produk yang
 * berlaku hari ini. Tidak menulis hasil ke pengajuan dan tidak mengubah prosesnya (AC-38.01 s.d. AC-38.04).
 */
@Injectable()
export class TestScoringModelUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly models: ScoringModelDraftsRepository,
    private readonly applications: ApplicationProcess,
    private readonly facts: ApplicationFactsReader,
    private readonly terms: ProductTerms,
    private readonly evaluator: ModelEvaluator,
  ) {}

  execute(ctx: TenantContext, modelId: string, body: ScoringModelTestRequest): Promise<ScoringModelTestResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const model = await this.models.findById(tx, modelId);
      if (!model) throw DomainError.standard("NOT_FOUND");
      const application = await this.applications.findByLoanId(tx, body.sampleLoanId);
      const facts = application && (await this.facts.of(tx, application.id));
      if (!facts) throw applicationNotFound();
      if (model.modelGroup === "SCORING" && model.cutOff === null) {
        throw DomainError.standard("VALIDATION_FAILED", undefined, [
          { field: "cutOff", code: "VALIDATION_FAILED", message: SCORING_MODEL_MESSAGES.cutOffRequired },
        ]);
      }
      const parameterSnapshot = await this.terms.snapshot(tx, facts.productId, businessDate(new Date()));
      const criteria = await this.models.criteriaOf(tx, model.id);
      const { evaluations, outcome } = await this.evaluator.evaluate(
        tx,
        { tenantId: ctx.tenantId, parameterSnapshot },
        facts,
        { ...model, criteria },
        model.modelGroup,
      );
      if (typeof outcome === "string") throw new DomainError("BUSINESS_RULE_VIOLATION", outcome, 422);
      return {
        data: {
          sampleLoanId: body.sampleLoanId,
          modelGroup: model.modelGroup,
          constant: model.constant,
          cutOff: model.cutOff,
          totalScore: outcome.totalScore,
          result: outcome.outcome,
          criteria: evaluations.map((evaluation) => ({
            criterionId: evaluation.criterionId,
            displayText: evaluation.displayText,
            actualValue: evaluation.actualValue,
            isMet: evaluation.isMet,
            appliedWeight: evaluation.appliedWeight,
          })),
        },
      };
    });
  }
}
