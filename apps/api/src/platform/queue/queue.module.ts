import { Global, Module } from "@nestjs/common";
import { OutboxEventsRepository } from "../db/outbox-events.repository.js";
import { JobQueue } from "./job-queue.js";
import { Outbox } from "./outbox.js";

/** pg-boss dan outbox bersama untuk semua modul (technical-specs 03 §3.1 `platform/queue`). */
@Global()
@Module({
  providers: [JobQueue, OutboxEventsRepository, Outbox],
  exports: [JobQueue, Outbox],
})
export class QueueModule {}
