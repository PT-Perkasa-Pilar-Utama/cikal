import { z } from "zod";
import type { QueueDefinition } from "../../../../platform/queue/queue-definition.js";

/** Pemeliharaan partisi bulanan log panggilan integrasi (technical-specs 06 §6.10, NF-31). */
export const CALL_LOG_PARTITIONS_QUEUE = "integration.call-log-partitions";

/** Setiap hari pukul 01.00 Asia/Jakarta; partisi dibuat 2 bulan di depan, jadi beberapa hari gagal belum berdampak. */
export const CALL_LOG_PARTITIONS_CRON = "0 1 * * *";

export const integrationQueues: readonly QueueDefinition[] = [
  { name: CALL_LOG_PARTITIONS_QUEUE, policy: "singleton", retryLimit: 3, retryDelay: 300, retryBackoff: true },
];

export const callLogPartitionsJobSchema = z.object({});
