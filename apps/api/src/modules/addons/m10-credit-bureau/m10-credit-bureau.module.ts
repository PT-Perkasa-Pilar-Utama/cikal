import { Module, type OnModuleInit } from "@nestjs/common";
import { ApplicationModule } from "../../core/application/index.js";
import { IntegrationApi, IntegrationModule } from "../../core/integration/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { TenancyModule } from "../../core/tenancy/index.js";
import { simulationCreditBureauAdapter } from "./adapters/simulation.adapter.js";
import { CreditBureauStepHandler } from "./application/credit-bureau-step-handler.js";
import { GetApplicationCreditBureauUseCase } from "./application/get-application-credit-bureau.use-case.js";
import { CreditBureauRepository } from "./db/credit-bureau.repository.js";
import { ApplicationCreditBureauController } from "./http/application-credit-bureau.controller.js";

/** M10 Credit Bureau: langkah CREDIT_BUREAU lewat CreditBureauPort (technical-specs 05 §5.18). */
@Module({
  imports: [ApplicationModule, IntegrationModule, OrchestratorModule, TenancyModule],
  controllers: [ApplicationCreditBureauController],
  providers: [CreditBureauRepository, CreditBureauStepHandler, GetApplicationCreditBureauUseCase],
})
export class M10CreditBureauModule implements OnModuleInit {
  constructor(
    private readonly integration: IntegrationApi,
    private readonly steps: StepHandlerRegistry,
    private readonly creditBureauStep: CreditBureauStepHandler,
  ) {}

  /** Adapter ikut terpasang bersama modul (technical-specs 13 §13.1, AP-02) dan StepHandler `CREDIT_BUREAU`. */
  onModuleInit(): void {
    this.integration.registerAdapter(simulationCreditBureauAdapter);
    this.steps.register(this.creditBureauStep);
  }
}
