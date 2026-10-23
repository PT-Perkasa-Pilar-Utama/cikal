import { Injectable, type OnModuleInit } from "@nestjs/common";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { AdvanceProcess } from "../application/advance-process.js";
import { ADVANCE_QUEUE, advanceJobSchema } from "./queues.js";

/** Konsumen pg-boss `orchestrator.advance` (technical-specs 12 §12.6); berjalan hanya di proses worker. */
@Injectable()
export class AdvanceJob implements OnModuleInit {
  constructor(
    private readonly queue: JobQueue,
    private readonly advance: AdvanceProcess,
  ) {}

  onModuleInit(): void {
    this.queue.consume(ADVANCE_QUEUE, advanceJobSchema, (job) =>
      this.advance.execute(job.tenantId, job.processInstanceId),
    );
  }
}
