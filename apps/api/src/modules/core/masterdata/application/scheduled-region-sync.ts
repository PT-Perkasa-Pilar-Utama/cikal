import { Injectable, Logger } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { RegionSyncLauncher } from "./region-sync-launcher.js";

/**
 * Sinkronisasi wilayah terjadwal (technical-specs 05 §5.4 `syncRegions()`) tanpa user, lewat alur yang sama dengan
 * tombol manual. Bila sinkronisasi manual masih RUNNING, jadwal kali ini dilewati.
 */
@Injectable()
export class ScheduledRegionSync {
  private readonly logger = new Logger(ScheduledRegionSync.name);

  constructor(
    private readonly db: TenantTx,
    private readonly launcher: RegionSyncLauncher,
  ) {}

  async run(): Promise<void> {
    const sync = await this.db.withInstallationTx((tx) => this.launcher.launch(tx, null));
    if (!sync) this.logger.log("Scheduled region sync skipped: another sync is running");
  }
}
