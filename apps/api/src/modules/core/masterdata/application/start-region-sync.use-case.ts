import type { RegionSyncStartedResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { RegionSyncsRepository } from "../db/region-syncs.repository.js";
import { regionErrors } from "../domain/region-errors.js";
import { REGION_SYNC_QUEUE } from "../jobs/queues.js";

/** Sinkronisasi RUNNING lebih lama dari ini dianggap mati, contoh worker berhenti di tengah job. */
const STALE_AFTER_MS = 30 * 60_000;

/** Tombol "Sync Region Data" (api-specs 06 §6.3.3, AC-23.01): satu sinkronisasi per instalasi. */
@Injectable()
export class StartRegionSyncUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly syncs: RegionSyncsRepository,
    private readonly queue: JobQueue,
  ) {}

  execute(ctx: RequestContext): Promise<RegionSyncStartedResponse> {
    const syncId = uuidv7();
    const startedAt = new Date();
    return this.db.withTenantTx(ctx, async (tx) => {
      await this.syncs.failStale(tx, new Date(startedAt.getTime() - STALE_AFTER_MS));
      if (!(await this.syncs.insertRunning(tx, syncId, startedAt, ctx.userId))) throw regionErrors.syncInProgress();
      await this.queue.enqueue(tx, REGION_SYNC_QUEUE, { syncId, tenantId: ctx.tenantId });
      return { data: { syncId, status: "RUNNING", startedAt: startedAt.toISOString() } };
    });
  }
}
