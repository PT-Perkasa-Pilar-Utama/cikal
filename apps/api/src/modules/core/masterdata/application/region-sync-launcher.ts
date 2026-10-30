import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { RegionSyncsRepository } from "../db/region-syncs.repository.js";
import { REGION_SYNC_QUEUE } from "../jobs/queues.js";

/** Sinkronisasi RUNNING lebih lama dari ini dianggap mati, contoh worker berhenti di tengah job. */
const STALE_AFTER_MS = 30 * 60_000;

export interface LaunchedRegionSync {
  syncId: string;
  startedAt: Date;
}

/**
 * Memulai sinkronisasi wilayah dari tombol maupun jadwal (api-specs 06 §6.3.3 langkah 1-2): satu sinkronisasi
 * RUNNING per instalasi, dan job worker ditulis di transaksi yang sama.
 */
@Injectable()
export class RegionSyncLauncher {
  constructor(
    private readonly syncs: RegionSyncsRepository,
    private readonly queue: JobQueue,
  ) {}

  /** Sinkronisasi baru, atau `null` bila sinkronisasi lain masih RUNNING. `userId` `null` untuk jadwal. */
  async launch(tx: Tx, userId: string | null): Promise<LaunchedRegionSync | null> {
    const syncId = uuidv7();
    const startedAt = new Date();
    await this.syncs.failStale(tx, new Date(startedAt.getTime() - STALE_AFTER_MS));
    if (!(await this.syncs.insertRunning(tx, syncId, startedAt, userId))) return null;
    await this.queue.enqueue(tx, REGION_SYNC_QUEUE, { syncId });
    return { syncId, startedAt };
  }
}
