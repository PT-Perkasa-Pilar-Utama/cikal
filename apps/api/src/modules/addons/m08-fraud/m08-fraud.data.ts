import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `m08_fraud` (technical-specs 02 §2.7). */
export const m08FraudData = defineModuleData(import.meta.url, { code: "m08-fraud", schema: "m08_fraud" });
