import { Global, Module } from "@nestjs/common";
import { JobQueue } from "./job-queue.js";

/** pg-boss bersama untuk semua modul (technical-specs 03 §3.1 `platform/queue`). */
@Global()
@Module({
  providers: [JobQueue],
  exports: [JobQueue],
})
export class QueueModule {}
