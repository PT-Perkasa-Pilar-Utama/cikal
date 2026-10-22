import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `m15_disbursement` (technical-specs 02 §2.7). */
export const m15DisbursementData = defineModuleData(import.meta.url, {
  code: "m15-disbursement",
  schema: "m15_disbursement",
});
