import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `cr` (technical-specs 02 §2.7). */
export const changeRequestData = defineModuleData(import.meta.url, { code: "change-request", schema: "cr" });
