import { Injectable, type OnModuleInit } from "@nestjs/common";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { CallLogPartitionsRepository } from "../db/call-log-partitions.repository.js";
import { CALL_LOG_PARTITIONS_CRON, CALL_LOG_PARTITIONS_QUEUE, callLogPartitionsJobSchema } from "./queues.js";

/** Job terjadwal `integration.call-log-partitions`; jadwal dan konsumen berjalan hanya di proses worker. */
@Injectable()
export class CallLogPartitionsJob implements OnModuleInit {
  constructor(
    private readonly queue: JobQueue,
    private readonly partitions: CallLogPartitionsRepository,
  ) {}

  onModuleInit(): void {
    this.queue.consume(CALL_LOG_PARTITIONS_QUEUE, callLogPartitionsJobSchema, () => this.partitions.maintain());
    this.queue.schedule(CALL_LOG_PARTITIONS_QUEUE, CALL_LOG_PARTITIONS_CRON);
  }
}
