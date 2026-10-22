import { defineModuleData } from "./migrate/module-data.js";

/** Skema `platform` milik infrastruktur bersama (idempotensi; nanti outbox dan secret), technical-specs 05 §5.0. */
export const platformData = defineModuleData(import.meta.url, { code: "platform", schema: "platform" });
