import { Injectable, type OnModuleInit } from "@nestjs/common";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { WaitingSteps } from "../application/waiting-steps.js";
import { WAIT_DEADLINE_QUEUE, waitDeadlineJobSchema } from "./queues.js";

/** Konsumen pg-boss `orchestrator.wait-deadline` (IN-08); berjalan hanya di proses worker. */
@Injectable()
export class WaitDeadlineJob implements OnModuleInit {
  constructor(
    private readonly queue: JobQueue,
    private readonly waiting: WaitingSteps,
  ) {}

  onModuleInit(): void {
    this.queue.consume(WAIT_DEADLINE_QUEUE, waitDeadlineJobSchema, (job) =>
      this.waiting.expireWait(job.tenantId, job.stepExecutionId),
    );
  }
}
