import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `m11_decision` (technical-specs 02 §2.7). */
export const m11DecisionData = defineModuleData(import.meta.url, { code: "m11-decision", schema: "m11_decision" });
