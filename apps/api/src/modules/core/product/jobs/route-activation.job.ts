import { Injectable, type OnModuleInit } from "@nestjs/common";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { RouteActivation } from "../application/route-activation.js";
import { ROUTE_ACTIVATION_QUEUE, routeActivationJobSchema } from "./queues.js";

/** Konsumen pg-boss `product.route-activate`; berjalan hanya di proses worker. */
@Injectable()
export class RouteActivationJob implements OnModuleInit {
  constructor(
    private readonly queue: JobQueue,
    private readonly activation: RouteActivation,
  ) {}

  onModuleInit(): void {
    this.queue.consume(ROUTE_ACTIVATION_QUEUE, routeActivationJobSchema, (job) =>
      this.activation.activate(job.tenantId, job.versionId),
    );
  }
}
