import { Injectable, type OnModuleInit } from "@nestjs/common";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { RegionSync } from "../application/region-sync.js";
import { ScheduledRegionSync } from "../application/scheduled-region-sync.js";
import {
  REGION_SYNC_CRON,
  REGION_SYNC_QUEUE,
  REGION_SYNC_SCHEDULE_QUEUE,
  regionSyncJobSchema,
  regionSyncScheduleJobSchema,
} from "./queues.js";

/** Konsumen pg-boss `masterdata.region-sync` dan jadwal `masterdata.region-sync-schedule`; hanya di proses worker. */
@Injectable()
export class RegionSyncJob implements OnModuleInit {
  constructor(
    private readonly queue: JobQueue,
    private readonly sync: RegionSync,
    private readonly scheduled: ScheduledRegionSync,
  ) {}

  onModuleInit(): void {
    this.queue.consume(REGION_SYNC_QUEUE, regionSyncJobSchema, (job) => this.sync.run(job));
    this.queue.consume(REGION_SYNC_SCHEDULE_QUEUE, regionSyncScheduleJobSchema, () => this.scheduled.run());
    this.queue.schedule(REGION_SYNC_SCHEDULE_QUEUE, REGION_SYNC_CRON);
  }
}
