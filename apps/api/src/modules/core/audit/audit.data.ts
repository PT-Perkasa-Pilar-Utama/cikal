import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `audit` (technical-specs 02 §2.7). */
export const auditData = defineModuleData(import.meta.url, { code: "audit", schema: "audit" });
