import { getTableName } from "drizzle-orm";
import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { formulaExecutionLogs } from "./db/schema.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `calculation` (technical-specs 02 §2.7). */
export const calculationData = defineModuleData(import.meta.url, {
  code: "calculation",
  schema: "calculation",
  appendOnlyTables: [getTableName(formulaExecutionLogs)],
});
