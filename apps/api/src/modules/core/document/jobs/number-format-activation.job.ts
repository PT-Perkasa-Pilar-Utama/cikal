import { Injectable, type OnModuleInit } from "@nestjs/common";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { NumberFormatActivation } from "../application/number-format-activation.js";
import { NUMBER_FORMAT_ACTIVATION_QUEUE, numberFormatActivationJobSchema } from "./queues.js";

/** Konsumen pg-boss `document.number-format-activate`; berjalan hanya di proses worker. */
@Injectable()
export class NumberFormatActivationJob implements OnModuleInit {
  constructor(
    private readonly queue: JobQueue,
    private readonly activation: NumberFormatActivation,
  ) {}

  onModuleInit(): void {
    this.queue.consume(NUMBER_FORMAT_ACTIVATION_QUEUE, numberFormatActivationJobSchema, (job) =>
      this.activation.activate(job.tenantId, job.formatId),
    );
  }
}
