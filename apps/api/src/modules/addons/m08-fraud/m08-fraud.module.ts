import { Module, type OnModuleInit } from "@nestjs/common";
import { ApplicationModule } from "../../core/application/index.js";
import { IntegrationApi, IntegrationModule } from "../../core/integration/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { TenancyModule } from "../../core/tenancy/index.js";
import { simulationIpReputationAdapter } from "./adapters/simulation.adapter.js";
import { FraudStepHandler } from "./application/fraud-step-handler.js";
import { GetApplicationFraudUseCase } from "./application/get-application-fraud.use-case.js";
import { FraudRepository } from "./db/fraud.repository.js";
import { ApplicationFraudController } from "./http/application-fraud.controller.js";

/** M08 Fraud: blacklist, velocity, reputasi IP lewat IpReputationPort (technical-specs 05 §5.18). */
@Module({
  imports: [ApplicationModule, IntegrationModule, OrchestratorModule, TenancyModule],
  controllers: [ApplicationFraudController],
  providers: [FraudRepository, FraudStepHandler, GetApplicationFraudUseCase],
})
export class M08FraudModule implements OnModuleInit {
  constructor(
    private readonly integration: IntegrationApi,
    private readonly steps: StepHandlerRegistry,
    private readonly fraudStep: FraudStepHandler,
  ) {}

  /** Adapter ikut terpasang bersama modul (technical-specs 13 §13.1, AP-02) dan StepHandler `FRAUD` (12 §12.2). */
  onModuleInit(): void {
    this.integration.registerAdapter(simulationIpReputationAdapter);
    this.steps.register(this.fraudStep);
  }
}
