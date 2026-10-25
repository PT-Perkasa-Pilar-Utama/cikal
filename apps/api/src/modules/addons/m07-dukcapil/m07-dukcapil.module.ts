import { Module, type OnModuleInit } from "@nestjs/common";
import { ApplicationModule } from "../../core/application/index.js";
import { IntegrationApi, IntegrationModule } from "../../core/integration/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { TenancyModule } from "../../core/tenancy/index.js";
import { simulationDukcapilAdapter } from "./adapters/simulation.adapter.js";
import { DukcapilStepHandler } from "./application/dukcapil-step-handler.js";
import { GetApplicationDukcapilUseCase } from "./application/get-application-dukcapil.use-case.js";
import { DukcapilRepository } from "./db/dukcapil.repository.js";
import { ApplicationDukcapilController } from "./http/application-dukcapil.controller.js";

/** M07 Dukcapil: langkah DUKCAPIL lewat DukcapilPort (technical-specs 05 §5.18). */
@Module({
  imports: [ApplicationModule, IntegrationModule, OrchestratorModule, TenancyModule],
  controllers: [ApplicationDukcapilController],
  providers: [DukcapilRepository, DukcapilStepHandler, GetApplicationDukcapilUseCase],
})
export class M07DukcapilModule implements OnModuleInit {
  constructor(
    private readonly integration: IntegrationApi,
    private readonly steps: StepHandlerRegistry,
    private readonly dukcapilStep: DukcapilStepHandler,
  ) {}

  /** Adapter ikut terpasang bersama modul (technical-specs 13 §13.1, AP-02) dan StepHandler `DUKCAPIL` (12 §12.2). */
  onModuleInit(): void {
    this.integration.registerAdapter(simulationDukcapilAdapter);
    this.steps.register(this.dukcapilStep);
  }
}
