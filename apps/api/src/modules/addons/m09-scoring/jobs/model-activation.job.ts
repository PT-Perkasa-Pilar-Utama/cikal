import { Injectable, type OnModuleInit } from "@nestjs/common";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { ScoringModelActivation } from "../application/scoring-model-activation.js";
import { MODEL_ACTIVATION_QUEUE, modelActivationJobSchema } from "./queues.js";

/** Konsumen pg-boss `m09-scoring.model-activate`; berjalan hanya di proses worker. */
@Injectable()
export class ModelActivationJob implements OnModuleInit {
  constructor(
    private readonly queue: JobQueue,
    private readonly activation: ScoringModelActivation,
  ) {}

  onModuleInit(): void {
    this.queue.consume(MODEL_ACTIVATION_QUEUE, modelActivationJobSchema, (job) =>
      this.activation.activate(job.tenantId, job.modelId),
    );
  }
}
