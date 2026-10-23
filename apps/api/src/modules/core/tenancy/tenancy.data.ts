import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { base, dev } from "./seed/index.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `tenancy` (technical-specs 02 §2.7). */
export const tenancyData = defineModuleData(import.meta.url, {
  code: "tenancy",
  schema: "tenancy",
  seeds: { base, dev },
});
