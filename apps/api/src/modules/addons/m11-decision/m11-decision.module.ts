import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { CHANGE_REQUEST_PORT } from "../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../../core/change-request/index.js";
import { ListDecisionMatrixUseCase } from "./application/list-decision-matrix.use-case.js";
import { MatrixChangeHandler } from "./application/matrix-change-handler.js";
import { MatrixChecks } from "./application/matrix-checks.js";
import { RequestMatrixRowCreateUseCase } from "./application/request-matrix-row-create.use-case.js";
import { RequestMatrixRowUpdateUseCase } from "./application/request-matrix-row-update.use-case.js";
import { SimulateDecisionUseCase } from "./application/simulate-decision.use-case.js";
import { DecisionMatrixRepository } from "./db/decision-matrix.repository.js";
import { DecisionMatrixController } from "./http/decision-matrix.controller.js";

/** M11 Decision Engine: Decision Matrix dan recontest (technical-specs 05 §5.18). */
@Module({
  controllers: [DecisionMatrixController],
  providers: [
    DecisionMatrixRepository,
    MatrixChecks,
    MatrixChangeHandler,
    ListDecisionMatrixUseCase,
    RequestMatrixRowCreateUseCase,
    RequestMatrixRowUpdateUseCase,
    SimulateDecisionUseCase,
  ],
})
export class M11DecisionModule implements OnModuleInit {
  constructor(
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    private readonly matrixHandler: MatrixChangeHandler,
  ) {}

  /** `registerEntity` untuk `DECISION_MATRIX` (technical-specs 05 §5.6). */
  onModuleInit(): void {
    this.changeRequests.register(this.matrixHandler);
  }
}
