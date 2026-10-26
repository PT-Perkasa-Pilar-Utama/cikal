import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { CHANGE_REQUEST_PORT } from "../../../platform/http/change-request-port.js";
import { ApplicationModule } from "../../core/application/index.js";
import { CalculationModule } from "../../core/calculation/index.js";
import type { ChangeRequestPort } from "../../core/change-request/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { ProductModule } from "../../core/product/index.js";
import { TenancyModule } from "../../core/tenancy/index.js";
import { CriterionChecks } from "./application/criterion-checks.js";
import { DraftModels } from "./application/draft-models.js";
import { EditCriteriaUseCase } from "./application/edit-criteria.use-case.js";
import { GetApplicationScoringUseCase } from "./application/get-application-scoring.use-case.js";
import { GetScoringModelUseCase } from "./application/get-scoring-model.use-case.js";
import { ListScoringModelsUseCase } from "./application/list-scoring-models.use-case.js";
import { ModelStep } from "./application/model-step.js";
import { ModelViews } from "./application/model-views.js";
import { RacStepHandler } from "./application/rac-step-handler.js";
import { SaveScoringModelUseCase } from "./application/save-scoring-model.use-case.js";
import { ScoringModelActivation } from "./application/scoring-model-activation.js";
import { ScoringModelChangeHandler } from "./application/scoring-model-change-handler.js";
import { ScoringModelChanges } from "./application/scoring-model-changes.js";
import { ScoringStepHandler } from "./application/scoring-step-handler.js";
import { SubmitScoringModelUseCase } from "./application/submit-scoring-model.use-case.js";
import { VariableValuesResolver } from "./application/variable-values.js";
import { ScoringModelDraftsRepository } from "./db/scoring-model-drafts.repository.js";
import { ScoringModelsRepository } from "./db/scoring-models.repository.js";
import { ScoringResultsRepository } from "./db/scoring-results.repository.js";
import { ApplicationScoringController } from "./http/application-scoring.controller.js";
import { ScoringCriteriaController } from "./http/scoring-criteria.controller.js";
import { ScoringModelsController } from "./http/scoring-models.controller.js";
import { ModelActivationJob } from "./jobs/model-activation.job.js";

/** M09 Scoring & RAC: model scoring dan RAC, editor model, langkah RAC dan SCORING (technical-specs 05 §5.18). */
@Module({
  imports: [ApplicationModule, CalculationModule, OrchestratorModule, ProductModule, TenancyModule],
  controllers: [ApplicationScoringController, ScoringModelsController, ScoringCriteriaController],
  providers: [
    ScoringModelsRepository,
    ScoringModelDraftsRepository,
    ScoringResultsRepository,
    VariableValuesResolver,
    ModelStep,
    RacStepHandler,
    ScoringStepHandler,
    GetApplicationScoringUseCase,
    ModelViews,
    CriterionChecks,
    DraftModels,
    ScoringModelChanges,
    ScoringModelActivation,
    ScoringModelChangeHandler,
    ModelActivationJob,
    ListScoringModelsUseCase,
    GetScoringModelUseCase,
    SaveScoringModelUseCase,
    EditCriteriaUseCase,
    SubmitScoringModelUseCase,
  ],
})
export class M09ScoringModule implements OnModuleInit {
  constructor(
    private readonly steps: StepHandlerRegistry,
    private readonly racStep: RacStepHandler,
    private readonly scoringStep: ScoringStepHandler,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    private readonly modelChanges: ScoringModelChangeHandler,
  ) {}

  /** StepHandler `RAC` dan `SCORING` (technical-specs 12 §12.2) dan `registerEntity` `SCORING_MODEL` (05 §5.6). */
  onModuleInit(): void {
    this.steps.register(this.racStep);
    this.steps.register(this.scoringStep);
    this.changeRequests.register(this.modelChanges);
  }
}
