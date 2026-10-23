import { Injectable } from "@nestjs/common";
import type { z } from "zod";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import {
  ADVANCE_QUEUE,
  type advanceJobSchema,
  WAIT_DEADLINE_QUEUE,
  type waitDeadlineJobSchema,
} from "../jobs/queues.js";

const SECOND_MS = 1_000;

/** Job orchestrator ditulis di transaksi langkah, sehingga langkah dan job berikutnya commit bersama (NF-24). */
@Injectable()
export class ProcessJobs {
  constructor(private readonly queue: JobQueue) {}

  /** `advance(processId)` berikutnya; `delaySeconds` untuk jeda retry otomatis (ER-03). */
  async advance(tx: Tx, process: { id: string; tenantId: string }, delaySeconds = 0): Promise<void> {
    const job: z.infer<typeof advanceJobSchema> = { tenantId: process.tenantId, processInstanceId: process.id };
    const options = delaySeconds > 0 ? { startAfter: new Date(Date.now() + delaySeconds * SECOND_MS) } : {};
    await this.queue.enqueue(tx, ADVANCE_QUEUE, job, options);
  }

  /** Pemeriksaan batas tunggu langkah WAITING_EXTERNAL (IN-08). */
  async waitDeadline(tx: Tx, tenantId: string, stepExecutionId: string, at: Date): Promise<void> {
    const job: z.infer<typeof waitDeadlineJobSchema> = { tenantId, stepExecutionId };
    await this.queue.enqueue(tx, WAIT_DEADLINE_QUEUE, job, { startAfter: at });
  }
}
