import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { seedDukcapilRules } from "./seed/dukcapil-rules.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `m07_dukcapil` (technical-specs 02 §2.7). */
export const m07DukcapilData = defineModuleData(import.meta.url, {
  code: "m07-dukcapil",
  schema: "m07_dukcapil",
  seeds: { dev: seedDukcapilRules },
});
