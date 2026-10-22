import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `notification` (technical-specs 02 §2.7). */
export const notificationData = defineModuleData(import.meta.url, { code: "notification", schema: "notification" });
