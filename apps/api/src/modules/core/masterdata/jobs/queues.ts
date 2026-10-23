import { z } from "zod";
import type { QueueDefinition } from "../../../../platform/queue/queue-definition.js";

/** Sinkronisasi wilayah dari tombol "Sync Region Data" (api-specs 06 §6.3.3 langkah 2). */
export const REGION_SYNC_QUEUE = "masterdata.region-sync";

/** Tanpa retry: hasil gagal langsung tampil ke Maker (AC-23.02), yang bisa menekan tombol lagi. */
export const masterDataQueues: readonly QueueDefinition[] = [
  { name: REGION_SYNC_QUEUE, policy: "standard", retryLimit: 0, expireInSeconds: 30 * 60 },
];

/** `tenantId` hanya untuk transaksi worker; data wilayah berlaku untuk semua company. */
export const regionSyncJobSchema = z.object({ syncId: z.uuid(), tenantId: z.uuid() });
export type RegionSyncJob = z.infer<typeof regionSyncJobSchema>;
