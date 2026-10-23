import { Module } from "@nestjs/common";
import { IntegrationApi } from "./application/integration-api.js";
import { IntegrationCallLogsRepository } from "./db/integration-call-logs.repository.js";
import { IntegrationConfigsRepository } from "./db/integration-configs.repository.js";

/** Integration Registry: adapter, konfigurasi penyedia, log panggilan (technical-specs 05 §5.15, 13). */
@Module({
  providers: [IntegrationConfigsRepository, IntegrationCallLogsRepository, IntegrationApi],
  exports: [IntegrationApi],
})
export class IntegrationModule {}
