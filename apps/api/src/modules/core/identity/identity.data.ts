import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `iam` (technical-specs 02 §2.7). */
export const identityData = defineModuleData(import.meta.url, { code: "identity", schema: "iam" });
