import type { RegionSearchQuery, RegionSearchResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { RegionSyncsRepository } from "../db/region-syncs.repository.js";
import { RegionsRepository } from "../db/regions.repository.js";

/** Pencarian di halaman "Master Geography" (api-specs 06 §6.3.2, AC-23.03). */
@Injectable()
export class SearchRegionsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly regions: RegionsRepository,
    private readonly syncs: RegionSyncsRepository,
  ) {}

  execute(ctx: RequestContext, query: RegionSearchQuery): Promise<RegionSearchResponse> {
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize };
    return this.db.withTenantTx(ctx, async (tx) => {
      const totalItems = await this.regions.countSearch(tx, query.q);
      const lastSyncAt = await this.syncs.lastSyncAt(tx);
      return {
        data: await this.regions.search(tx, query.q, page),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
          lastSyncAt: lastSyncAt?.toISOString() ?? null,
        },
      };
    });
  }
}
