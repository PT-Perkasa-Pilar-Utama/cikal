import type { RegionSyncStartedResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { regionErrors } from "../domain/region-errors.js";
import { RegionSyncLauncher } from "./region-sync-launcher.js";

/** Tombol "Sync Region Data" (api-specs 06 §6.3.3, AC-23.01): satu sinkronisasi per instalasi. */
@Injectable()
export class StartRegionSyncUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly launcher: RegionSyncLauncher,
  ) {}

  execute(ctx: RequestContext): Promise<RegionSyncStartedResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const sync = await this.launcher.launch(tx, ctx.userId);
      if (!sync) throw regionErrors.syncInProgress();
      return { data: { syncId: sync.syncId, status: "RUNNING", startedAt: sync.startedAt.toISOString() } };
    });
  }
}
