import { getTableName } from "drizzle-orm";
import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { maintainCallLogPartitions } from "./db/call-log-partitions.repository.js";
import { integrationCallLogs } from "./db/schema.js";
import { integrationQueues } from "./jobs/queues.js";
import { seedIntegrationConfigs } from "./seed/integration-configs.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `integration` (technical-specs 02 §2.7). */
export const integrationData = defineModuleData(import.meta.url, {
  code: "integration",
  schema: "integration",
  seeds: { dev: seedIntegrationConfigs },
  appendOnlyTables: [getTableName(integrationCallLogs)],
  queues: integrationQueues,
  afterMigrate: maintainCallLogPartitions,
});
