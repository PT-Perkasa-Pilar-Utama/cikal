import { Module, type OnModuleInit } from "@nestjs/common";
import { ApplicationModule } from "../../core/application/index.js";
import { CalculationModule } from "../../core/calculation/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { ProductModule } from "../../core/product/index.js";
import { TenancyModule } from "../../core/tenancy/index.js";
import { GetApplicationScoringUseCase } from "./application/get-application-scoring.use-case.js";
import { ModelStep } from "./application/model-step.js";
import { RacStepHandler } from "./application/rac-step-handler.js";
import { ScoringStepHandler } from "./application/scoring-step-handler.js";
import { VariableValuesResolver } from "./application/variable-values.js";
import { ScoringModelsRepository } from "./db/scoring-models.repository.js";
import { ScoringResultsRepository } from "./db/scoring-results.repository.js";
import { ApplicationScoringController } from "./http/application-scoring.controller.js";

/** M09 Scoring & RAC: model scoring dan RAC, langkah RAC dan SCORING (technical-specs 05 §5.18). */
@Module({
  imports: [ApplicationModule, CalculationModule, OrchestratorModule, ProductModule, TenancyModule],
  controllers: [ApplicationScoringController],
  providers: [
    ScoringModelsRepository,
    ScoringResultsRepository,
    VariableValuesResolver,
    ModelStep,
    RacStepHandler,
    ScoringStepHandler,
    GetApplicationScoringUseCase,
  ],
})
export class M09ScoringModule implements OnModuleInit {
  constructor(
    private readonly steps: StepHandlerRegistry,
    private readonly racStep: RacStepHandler,
    private readonly scoringStep: ScoringStepHandler,
  ) {}

  /** StepHandler `RAC` dan `SCORING` (technical-specs 12 §12.2). */
  onModuleInit(): void {
    this.steps.register(this.racStep);
    this.steps.register(this.scoringStep);
  }
}
