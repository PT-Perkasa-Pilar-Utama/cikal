import type { AdapterErrorCategory } from "@cikal/contracts";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { RegionSnapshotsRepository } from "../db/region-snapshots.repository.js";
import { RegionSyncsRepository } from "../db/region-syncs.repository.js";
import { diffSnapshot, findInconsistency, pruneOrphans, type RegionSnapshot } from "../domain/region-snapshot.js";
import type { RegionSyncJob } from "../jobs/queues.js";
import { REGION_DATA_PORT, type RegionDataPort, RegionSourceError } from "../ports/region-data.port.js";

/**
 * `syncRegions()` (technical-specs 05 §5.4): seluruh data penyedia diambil lebih dulu, lalu dibandingkan dan
 * ditulis dalam satu transaksi. Penyedia gagal atau data rusak: data lama tidak berubah (AC-23.02).
 */
@Injectable()
export class RegionSync {
  private readonly logger = new Logger(RegionSync.name);

  constructor(
    private readonly db: TenantTx,
    private readonly snapshots: RegionSnapshotsRepository,
    private readonly syncs: RegionSyncsRepository,
    @Inject(REGION_DATA_PORT) private readonly source: RegionDataPort,
  ) {}

  async run(job: RegionSyncJob): Promise<void> {
    const snapshot = await this.fetch(job);
    if (!snapshot) return;
    try {
      await this.db.withInstallationTx(async (tx) => {
        const diff = diffSnapshot(await this.snapshots.load(tx), snapshot);
        const syncedAt = new Date();
        await this.snapshots.write(tx, snapshot, syncedAt);
        await this.syncs.complete(tx, job.syncId, diff.addedCount, diff.changedCount, syncedAt);
      });
    } catch (error) {
      await this.fail(job, null);
      throw error;
    }
  }

  /** Snapshot yang boleh ditulis, atau `null` setelah sinkronisasi ditandai FAILED. */
  private async fetch(job: RegionSyncJob): Promise<RegionSnapshot | null> {
    let snapshot: RegionSnapshot;
    try {
      snapshot = await this.source.fetchAll();
    } catch (error) {
      if (!(error instanceof RegionSourceError)) {
        await this.fail(job, null);
        throw error;
      }
      this.logger.warn(`Region sync ${job.syncId} failed: ${error.category} ${error.message}`);
      await this.fail(job, error.category);
      return null;
    }
    const problem = findInconsistency(snapshot);
    if (problem) {
      this.logger.warn(`Region sync ${job.syncId} rejected the provider data: ${problem}`);
      await this.fail(job, "INVALID_RESPONSE");
      return null;
    }
    const pruned = pruneOrphans(snapshot);
    if (pruned.skipped > 0) this.logger.warn(`Region sync ${job.syncId} skipped ${pruned.skipped} orphan regions`);
    return pruned.snapshot;
  }

  private fail(job: RegionSyncJob, category: AdapterErrorCategory | null): Promise<void> {
    return this.db.withInstallationTx((tx) => this.syncs.fail(tx, job.syncId, category));
  }
}
