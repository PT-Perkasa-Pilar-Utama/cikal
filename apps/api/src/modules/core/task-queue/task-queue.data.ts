import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `taskqueue` (technical-specs 02 §2.7). */
export const taskQueueData = defineModuleData(import.meta.url, { code: "task-queue", schema: "taskqueue" });
