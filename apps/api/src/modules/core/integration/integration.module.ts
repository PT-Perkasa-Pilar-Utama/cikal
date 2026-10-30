import { Module } from "@nestjs/common";
import { IntegrationApi } from "./application/integration-api.js";
import { CallLogPartitionsRepository } from "./db/call-log-partitions.repository.js";
import { IntegrationCallLogsRepository } from "./db/integration-call-logs.repository.js";
import { IntegrationConfigsRepository } from "./db/integration-configs.repository.js";
import { CallLogPartitionsJob } from "./jobs/call-log-partitions.job.js";

/** Integration Registry: adapter, konfigurasi penyedia, log panggilan (technical-specs 05 §5.15, 13). */
@Module({
  providers: [
    IntegrationConfigsRepository,
    IntegrationCallLogsRepository,
    CallLogPartitionsRepository,
    CallLogPartitionsJob,
    IntegrationApi,
  ],
  exports: [IntegrationApi],
})
export class IntegrationModule {}
