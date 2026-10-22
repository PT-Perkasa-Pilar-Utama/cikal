import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `application` (technical-specs 02 §2.7). */
export const applicationData = defineModuleData(import.meta.url, { code: "application", schema: "application" });
