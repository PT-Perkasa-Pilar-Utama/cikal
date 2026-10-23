import { defineModuleData } from "./migrate/module-data.js";
import { outboxQueues } from "./queue/outbox-queues.js";

/** Skema `platform` milik infrastruktur bersama (idempotensi, kunci tenant, outbox), technical-specs 05 §5.0. */
export const platformData = defineModuleData(import.meta.url, {
  code: "platform",
  schema: "platform",
  queues: outboxQueues,
});
