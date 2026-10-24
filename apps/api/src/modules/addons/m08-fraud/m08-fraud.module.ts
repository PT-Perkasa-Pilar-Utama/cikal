import { Module, type OnModuleInit } from "@nestjs/common";
import { IntegrationApi, IntegrationModule } from "../../core/integration/index.js";
import { simulationIpReputationAdapter } from "./adapters/simulation.adapter.js";

/** M08 Fraud: blacklist, velocity, reputasi IP lewat IpReputationPort (technical-specs 05 §5.18). */
@Module({ imports: [IntegrationModule] })
export class M08FraudModule implements OnModuleInit {
  constructor(private readonly integration: IntegrationApi) {}

  /** Adapter ikut terpasang bersama modul (technical-specs 13 §13.1, AP-02). */
  onModuleInit(): void {
    this.integration.registerAdapter(simulationIpReputationAdapter);
  }
}
