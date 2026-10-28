import { Module, type OnModuleInit } from "@nestjs/common";
import { ApplicationModule } from "../../core/application/index.js";
import { ApprovalModule } from "../../core/approval/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { TaskQueueModule } from "../../core/task-queue/index.js";
import { GetDisbursementUseCase } from "./application/get-disbursement.use-case.js";
import { SubmitValidityCheckUseCase } from "./application/submit-validity-check.use-case.js";
import { ValidityCheckStepHandler } from "./application/validity-check-step-handler.js";
import { DisbursementsRepository } from "./db/disbursements.repository.js";
import { DisbursementController } from "./http/disbursement.controller.js";

/** M15 Pencairan: Validity Check, Print Akad, pencairan lewat CoreBankingPort (technical-specs 05 §5.18). */
@Module({
  imports: [ApplicationModule, ApprovalModule, OrchestratorModule, TaskQueueModule],
  controllers: [DisbursementController],
  providers: [DisbursementsRepository, ValidityCheckStepHandler, GetDisbursementUseCase, SubmitValidityCheckUseCase],
})
export class M15DisbursementModule implements OnModuleInit {
  constructor(
    private readonly steps: StepHandlerRegistry,
    private readonly validityCheckStep: ValidityCheckStepHandler,
  ) {}

  /** StepHandler `VALIDITY_CHECK` (technical-specs 12 §12.2). */
  onModuleInit(): void {
    this.steps.register(this.validityCheckStep);
  }
}
