import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `m10_credit_bureau` (technical-specs 02 §2.7). */
export const m10CreditBureauData = defineModuleData(import.meta.url, {
  code: "m10-credit-bureau",
  schema: "m10_credit_bureau",
});
