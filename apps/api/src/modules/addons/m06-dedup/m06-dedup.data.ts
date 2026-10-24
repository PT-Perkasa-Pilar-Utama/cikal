import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { seedDedupMatrix } from "./seed/dedup-matrix.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `m06_dedup` (technical-specs 02 §2.7). */
export const m06DedupData = defineModuleData(import.meta.url, {
  code: "m06-dedup",
  schema: "m06_dedup",
  seeds: { dev: seedDedupMatrix },
});
