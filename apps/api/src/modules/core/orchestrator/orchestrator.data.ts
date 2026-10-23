import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { orchestratorQueues } from "./jobs/queues.js";

/** Kontrak migrasi, seed, dan antrean modul (technical-specs 06 §6.12); skema `orchestrator` (technical-specs 02 §2.7). */
export const orchestratorData = defineModuleData(import.meta.url, {
  code: "orchestrator",
  schema: "orchestrator",
  queues: orchestratorQueues,
});
