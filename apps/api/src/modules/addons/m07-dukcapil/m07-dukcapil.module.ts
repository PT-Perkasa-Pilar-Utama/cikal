import { Module, type OnModuleInit } from "@nestjs/common";
import { IntegrationApi, IntegrationModule } from "../../core/integration/index.js";
import { simulationDukcapilAdapter } from "./adapters/simulation.adapter.js";

/** M07 Dukcapil: langkah DUKCAPIL lewat DukcapilPort (technical-specs 05 §5.18). */
@Module({ imports: [IntegrationModule] })
export class M07DukcapilModule implements OnModuleInit {
  constructor(private readonly integration: IntegrationApi) {}

  /** Adapter ikut terpasang bersama modul (technical-specs 13 §13.1, AP-02). */
  onModuleInit(): void {
    this.integration.registerAdapter(simulationDukcapilAdapter);
  }
}
