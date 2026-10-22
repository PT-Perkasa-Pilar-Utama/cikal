import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `orchestrator` (technical-specs 02 §2.7). */
export const orchestratorData = defineModuleData(import.meta.url, { code: "orchestrator", schema: "orchestrator" });
