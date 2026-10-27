import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { seedQaTemplates } from "./seed/qa-templates.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `document` (technical-specs 02 §2.7). */
export const documentData = defineModuleData(import.meta.url, {
  code: "document",
  schema: "document",
  seeds: { qa: seedQaTemplates },
});
