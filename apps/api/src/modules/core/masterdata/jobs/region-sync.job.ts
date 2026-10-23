import { Injectable, type OnModuleInit } from "@nestjs/common";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { RegionSync } from "../application/region-sync.js";
import { REGION_SYNC_QUEUE, regionSyncJobSchema } from "./queues.js";

/** Konsumen pg-boss `masterdata.region-sync`; berjalan hanya di proses worker. */
@Injectable()
export class RegionSyncJob implements OnModuleInit {
  constructor(
    private readonly queue: JobQueue,
    private readonly sync: RegionSync,
  ) {}

  onModuleInit(): void {
    this.queue.consume(REGION_SYNC_QUEUE, regionSyncJobSchema, (job) => this.sync.run(job));
  }
}
