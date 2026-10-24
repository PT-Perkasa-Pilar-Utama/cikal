import { Module, type OnModuleInit } from "@nestjs/common";
import { ApplicationModule } from "../../core/application/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { TenancyModule } from "../../core/tenancy/index.js";
import { DedupStepHandler } from "./application/dedup-step-handler.js";
import { GetApplicationDedupUseCase } from "./application/get-application-dedup.use-case.js";
import { DedupConfigRepository } from "./db/dedup-config.repository.js";
import { DedupResultsRepository } from "./db/dedup-results.repository.js";
import { ApplicationDedupController } from "./http/application-dedup.controller.js";

/** M06 Dedup: langkah DEDUP dan Dedup Matrix (technical-specs 05 §5.18). */
@Module({
  imports: [ApplicationModule, OrchestratorModule, TenancyModule],
  controllers: [ApplicationDedupController],
  providers: [DedupConfigRepository, DedupResultsRepository, DedupStepHandler, GetApplicationDedupUseCase],
})
export class M06DedupModule implements OnModuleInit {
  constructor(
    private readonly steps: StepHandlerRegistry,
    private readonly dedupStep: DedupStepHandler,
  ) {}

  /** StepHandler `DEDUP` (technical-specs 12 §12.2). */
  onModuleInit(): void {
    this.steps.register(this.dedupStep);
  }
}
