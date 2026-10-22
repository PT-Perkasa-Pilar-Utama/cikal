import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `reporting` (technical-specs 02 §2.7). */
export const reportingData = defineModuleData(import.meta.url, { code: "reporting", schema: "reporting" });
