import { Module, type OnModuleInit } from "@nestjs/common";
import { ApplicationModule } from "../../core/application/index.js";
import { ApprovalModule } from "../../core/approval/index.js";
import { DocumentModule } from "../../core/document/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { OrganizationModule } from "../../core/organization/index.js";
import { ProductModule } from "../../core/product/index.js";
import { TaskQueueModule } from "../../core/task-queue/index.js";
import { AkadContents } from "./application/akad-contents.js";
import { AkadFileAccess } from "./application/akad-file-access.js";
import { DisbursementTasks } from "./application/disbursement-tasks.js";
import { GetDisbursementUseCase } from "./application/get-disbursement.use-case.js";
import { PrintAkadUseCase } from "./application/print-akad.use-case.js";
import { PrintAkadStepHandler } from "./application/print-akad-step-handler.js";
import { SubmitValidityCheckUseCase } from "./application/submit-validity-check.use-case.js";
import { ValidityCheckStepHandler } from "./application/validity-check-step-handler.js";
import { AkadPrintsRepository } from "./db/akad-prints.repository.js";
import { DisbursementsRepository } from "./db/disbursements.repository.js";
import { DisbursementController } from "./http/disbursement.controller.js";

/** M15 Pencairan: Validity Check, Print Akad, pencairan lewat CoreBankingPort (technical-specs 05 §5.18). */
@Module({
  imports: [
    ApplicationModule,
    ApprovalModule,
    DocumentModule,
    OrchestratorModule,
    OrganizationModule,
    ProductModule,
    TaskQueueModule,
  ],
  controllers: [DisbursementController],
  providers: [
    DisbursementsRepository,
    AkadPrintsRepository,
    DisbursementTasks,
    AkadContents,
    AkadFileAccess,
    ValidityCheckStepHandler,
    PrintAkadStepHandler,
    GetDisbursementUseCase,
    SubmitValidityCheckUseCase,
    PrintAkadUseCase,
  ],
})
export class M15DisbursementModule implements OnModuleInit {
  constructor(
    private readonly steps: StepHandlerRegistry,
    private readonly validityCheckStep: ValidityCheckStepHandler,
    private readonly printAkadStep: PrintAkadStepHandler,
  ) {}

  /** StepHandler `VALIDITY_CHECK` dan `PRINT_AKAD` (technical-specs 12 §12.2). */
  onModuleInit(): void {
    this.steps.register(this.validityCheckStep);
    this.steps.register(this.printAkadStep);
  }
}
