import { defineModuleData } from "../../../platform/migrate/module-data.js";
import { productQueues } from "./jobs/queues.js";

/** Kontrak migrasi, seed, dan antrean modul (technical-specs 06 §6.12); skema `product` (technical-specs 02 §2.7). */
export const productData = defineModuleData(import.meta.url, {
  code: "product",
  schema: "product",
  queues: productQueues,
});
