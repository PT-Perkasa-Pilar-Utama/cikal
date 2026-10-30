import { z } from "zod";
import type { QueueDefinition } from "../../../../platform/queue/queue-definition.js";

/** Sinkronisasi wilayah dari tombol "Sync Region Data" atau jadwal (api-specs 06 §6.3.3 langkah 2). */
export const REGION_SYNC_QUEUE = "masterdata.region-sync";

/** Pemicu sinkronisasi terjadwal `syncRegions()` (technical-specs 05 §5.4, 10 "Data wilayah Oksara"). */
export const REGION_SYNC_SCHEDULE_QUEUE = "masterdata.region-sync-schedule";

/** Setiap Minggu pukul 02.00 Asia/Jakarta: data wilayah jarang berubah, dan jam ini di luar jam kerja cabang. */
export const REGION_SYNC_CRON = "0 2 * * 0";

/** Sinkronisasi tanpa retry: hasil gagal langsung tampil ke Maker (AC-23.02), yang bisa menekan tombol lagi. */
export const masterDataQueues: readonly QueueDefinition[] = [
  { name: REGION_SYNC_QUEUE, policy: "standard", retryLimit: 0, expireInSeconds: 30 * 60 },
  { name: REGION_SYNC_SCHEDULE_QUEUE, policy: "singleton", retryLimit: 3, retryDelay: 300, retryBackoff: true },
];

/** Tanpa `tenantId`: data wilayah berlaku untuk semua company, jadi worker memakai transaksi instalasi. */
export const regionSyncJobSchema = z.object({ syncId: z.uuid() });
export type RegionSyncJob = z.infer<typeof regionSyncJobSchema>;

export const regionSyncScheduleJobSchema = z.object({});
