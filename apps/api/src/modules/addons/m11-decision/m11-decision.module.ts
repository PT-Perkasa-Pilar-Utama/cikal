import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { CHANGE_REQUEST_PORT } from "../../../platform/http/change-request-port.js";
import { ApplicationModule } from "../../core/application/index.js";
import type { ChangeRequestPort } from "../../core/change-request/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { TenancyModule } from "../../core/tenancy/index.js";
import { DecisionStepHandler } from "./application/decision-step-handler.js";
import { GetApplicationDecisionUseCase } from "./application/get-application-decision.use-case.js";
import { ListDecisionMatrixUseCase } from "./application/list-decision-matrix.use-case.js";
import { MatrixChangeHandler } from "./application/matrix-change-handler.js";
import { MatrixChecks } from "./application/matrix-checks.js";
import { RequestMatrixRowCreateUseCase } from "./application/request-matrix-row-create.use-case.js";
import { RequestMatrixRowUpdateUseCase } from "./application/request-matrix-row-update.use-case.js";
import { SimulateDecisionUseCase } from "./application/simulate-decision.use-case.js";
import { DecisionMatrixRepository } from "./db/decision-matrix.repository.js";
import { DecisionResultsRepository } from "./db/decision-results.repository.js";
import { ApplicationDecisionController } from "./http/application-decision.controller.js";
import { DecisionMatrixController } from "./http/decision-matrix.controller.js";

/** M11 Decision Engine: Decision Matrix, langkah DECISION, dan recontest (technical-specs 05 §5.18). */
@Module({
  imports: [ApplicationModule, OrchestratorModule, TenancyModule],
  controllers: [DecisionMatrixController, ApplicationDecisionController],
  providers: [
    DecisionMatrixRepository,
    DecisionResultsRepository,
    MatrixChecks,
    MatrixChangeHandler,
    DecisionStepHandler,
    ListDecisionMatrixUseCase,
    RequestMatrixRowCreateUseCase,
    RequestMatrixRowUpdateUseCase,
    SimulateDecisionUseCase,
    GetApplicationDecisionUseCase,
  ],
})
export class M11DecisionModule implements OnModuleInit {
  constructor(
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    private readonly steps: StepHandlerRegistry,
    private readonly matrixHandler: MatrixChangeHandler,
    private readonly decisionStep: DecisionStepHandler,
  ) {}

  /** `registerEntity` untuk `DECISION_MATRIX` (technical-specs 05 §5.6) dan StepHandler `DECISION` (12 §12.2). */
  onModuleInit(): void {
    this.changeRequests.register(this.matrixHandler);
    this.steps.register(this.decisionStep);
  }
}
