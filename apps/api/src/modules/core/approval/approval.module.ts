import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { CHANGE_REQUEST_PORT } from "../../../platform/http/change-request-port.js";
import { ApplicationModule } from "../application/index.js";
import { CalculationModule } from "../calculation/index.js";
import type { ChangeRequestPort } from "../change-request/index.js";
import { DocumentModule } from "../document/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../orchestrator/index.js";
import { OrganizationModule } from "../organization/index.js";
import { ProductModule } from "../product/index.js";
import { TaskQueueModule } from "../task-queue/index.js";
import { ApprovalSetups } from "./application/approval-setup.js";
import { ApprovalStepHandler } from "./application/approval-step-handler.js";
import { ApprovedFinancings } from "./application/approved-financings.js";
import { DecideApprovalUseCase } from "./application/decide-approval.use-case.js";
import { FinancingBuilder } from "./application/financing-builder.js";
import { GetApplicationApprovalUseCase } from "./application/get-application-approval.use-case.js";
import { GetApplicationFinancingUseCase } from "./application/get-application-financing.use-case.js";
import { HierarchyChangeHandler } from "./application/hierarchy-change-handler.js";
import { HierarchyChecks } from "./application/hierarchy-checks.js";
import { ListHierarchiesUseCase } from "./application/list-hierarchies.use-case.js";
import { RequestHierarchyCreateUseCase } from "./application/request-hierarchy-create.use-case.js";
import { RequestHierarchyUpdateUseCase } from "./application/request-hierarchy-update.use-case.js";
import { Sp3kNumbers } from "./application/sp3k-numbers.js";
import { ApplicationApprovalsRepository } from "./db/application-approvals.repository.js";
import { FinancingsRepository } from "./db/financings.repository.js";
import { HierarchiesRepository } from "./db/hierarchies.repository.js";
import { LevelsRepository } from "./db/levels.repository.js";
import { ApplicationApprovalController } from "./http/application-approval.controller.js";
import { ApprovalHierarchiesController } from "./http/approval-hierarchies.controller.js";

/** Approval: level, hierarki, keputusan, auto approval, struktur kredit (technical-specs 05 §5.14). */
@Module({
  imports: [
    ApplicationModule,
    CalculationModule,
    DocumentModule,
    OrchestratorModule,
    OrganizationModule,
    ProductModule,
    TaskQueueModule,
  ],
  controllers: [ApprovalHierarchiesController, ApplicationApprovalController],
  providers: [
    LevelsRepository,
    HierarchiesRepository,
    ApplicationApprovalsRepository,
    FinancingsRepository,
    HierarchyChecks,
    HierarchyChangeHandler,
    ListHierarchiesUseCase,
    RequestHierarchyCreateUseCase,
    RequestHierarchyUpdateUseCase,
    ApprovalSetups,
    FinancingBuilder,
    ApprovedFinancings,
    Sp3kNumbers,
    ApprovalStepHandler,
    GetApplicationApprovalUseCase,
    GetApplicationFinancingUseCase,
    DecideApprovalUseCase,
  ],
  exports: [ApprovedFinancings],
})
export class ApprovalModule implements OnModuleInit {
  constructor(
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    private readonly hierarchyHandler: HierarchyChangeHandler,
    private readonly steps: StepHandlerRegistry,
    private readonly stepHandler: ApprovalStepHandler,
  ) {}

  /** `registerEntity` untuk `APPROVAL_HIERARCHY` (technical-specs 05 §5.6) dan StepHandler `APPROVAL` (12 §12.2). */
  onModuleInit(): void {
    this.changeRequests.register(this.hierarchyHandler);
    this.steps.register(this.stepHandler);
  }
}
