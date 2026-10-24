import { Module, type OnModuleInit } from "@nestjs/common";
import { IntegrationApi, IntegrationModule } from "../../core/integration/index.js";
import { simulationCreditBureauAdapter } from "./adapters/simulation.adapter.js";

/** M10 Credit Bureau: langkah CREDIT_BUREAU lewat CreditBureauPort (technical-specs 05 §5.18). */
@Module({ imports: [IntegrationModule] })
export class M10CreditBureauModule implements OnModuleInit {
  constructor(private readonly integration: IntegrationApi) {}

  /** Adapter ikut terpasang bersama modul (technical-specs 13 §13.1, AP-02). */
  onModuleInit(): void {
    this.integration.registerAdapter(simulationCreditBureauAdapter);
  }
}
