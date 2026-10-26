import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { seedApprovalSetup } from "./seed/approval-setup.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `approval` (technical-specs 02 §2.7). */
export const approvalData = defineModuleData(import.meta.url, {
  code: "approval",
  schema: "approval",
  seeds: { qa: seedApprovalSetup },
});
