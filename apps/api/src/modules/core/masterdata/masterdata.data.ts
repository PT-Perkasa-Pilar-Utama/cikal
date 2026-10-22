import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { base, dev } from "./seed/index.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `masterdata` (technical-specs 02 §2.7). */
export const masterDataData = defineModuleData(import.meta.url, {
  code: "masterdata",
  schema: "masterdata",
  seeds: { base, dev },
});
