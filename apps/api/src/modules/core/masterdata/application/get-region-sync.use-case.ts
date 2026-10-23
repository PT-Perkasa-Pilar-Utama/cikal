import { REGION_SYNC_FAILED_MESSAGE, type RegionSyncStateResponse, regionSyncCompletedMessage } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { RegionSyncsRepository } from "../db/region-syncs.repository.js";

/** Polling hasil sinkronisasi (api-specs 06 §6.3.4): pesan AC-23.01 atau AC-23.02. */
@Injectable()
export class GetRegionSyncUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly syncs: RegionSyncsRepository,
  ) {}

  execute(ctx: RequestContext, syncId: string): Promise<RegionSyncStateResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const sync = await this.syncs.find(tx, syncId);
      if (!sync) throw DomainError.standard("NOT_FOUND");
      if (sync.status === "RUNNING") return { data: { status: "RUNNING" } };
      if (sync.status === "FAILED") {
        return { data: { status: "FAILED", errorCategory: sync.errorCategory }, message: REGION_SYNC_FAILED_MESSAGE };
      }
      const added = sync.addedCount ?? 0;
      const updated = sync.updatedCount ?? 0;
      const finishedAt = sync.finishedAt ?? sync.startedAt;
      const lastSyncAt = (await this.syncs.lastSyncAt(tx)) ?? finishedAt;
      return {
        data: {
          status: "COMPLETED",
          added,
          updated,
          finishedAt: finishedAt.toISOString(),
          lastSyncAt: lastSyncAt.toISOString(),
        },
        message: regionSyncCompletedMessage(added, updated),
      };
    });
  }
}
