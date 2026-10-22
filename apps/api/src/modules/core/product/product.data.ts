import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `product` (technical-specs 02 §2.7). */
export const productData = defineModuleData(import.meta.url, { code: "product", schema: "product" });
