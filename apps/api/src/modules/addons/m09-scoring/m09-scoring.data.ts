import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { seedQaModelProducts, seedScoringModels } from "./seed/scoring-models.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `m09_scoring` (technical-specs 02 §2.7). */
export const m09ScoringData = defineModuleData(import.meta.url, {
  code: "m09-scoring",
  schema: "m09_scoring",
  seeds: { dev: seedScoringModels, qa: seedQaModelProducts },
});
