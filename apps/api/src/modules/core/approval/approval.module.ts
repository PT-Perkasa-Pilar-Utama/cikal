import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { CHANGE_REQUEST_PORT } from "../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../change-request/index.js";
import { OrganizationModule } from "../organization/index.js";
import { ProductModule } from "../product/index.js";
import { HierarchyChangeHandler } from "./application/hierarchy-change-handler.js";
import { HierarchyChecks } from "./application/hierarchy-checks.js";
import { ListHierarchiesUseCase } from "./application/list-hierarchies.use-case.js";
import { RequestHierarchyCreateUseCase } from "./application/request-hierarchy-create.use-case.js";
import { RequestHierarchyUpdateUseCase } from "./application/request-hierarchy-update.use-case.js";
import { HierarchiesRepository } from "./db/hierarchies.repository.js";
import { LevelsRepository } from "./db/levels.repository.js";
import { ApprovalHierarchiesController } from "./http/approval-hierarchies.controller.js";

/** Approval: level, hierarki, keputusan, auto approval, struktur kredit (technical-specs 05 §5.14). */
@Module({
  imports: [OrganizationModule, ProductModule],
  controllers: [ApprovalHierarchiesController],
  providers: [
    LevelsRepository,
    HierarchiesRepository,
    HierarchyChecks,
    HierarchyChangeHandler,
    ListHierarchiesUseCase,
    RequestHierarchyCreateUseCase,
    RequestHierarchyUpdateUseCase,
  ],
})
export class ApprovalModule implements OnModuleInit {
  constructor(
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    private readonly hierarchyHandler: HierarchyChangeHandler,
  ) {}

  /** `registerEntity` untuk `APPROVAL_HIERARCHY` (technical-specs 05 §5.6). */
  onModuleInit(): void {
    this.changeRequests.register(this.hierarchyHandler);
  }
}
