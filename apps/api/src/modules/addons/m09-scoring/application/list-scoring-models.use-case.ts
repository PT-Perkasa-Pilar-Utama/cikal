import type { ScoringModelListQuery, ScoringModelListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { ModelViews } from "./model-views.js";

/** Halaman "Scoring Model" (api-specs 22 §22.1). */
@Injectable()
export class ListScoringModelsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly models: ScoringModelDraftsRepository,
    private readonly views: ModelViews,
  ) {}

  execute(ctx: TenantContext, query: ScoringModelListQuery): Promise<ScoringModelListResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const { page, pageSize } = query;
      const window = { offset: (page - 1) * pageSize, limit: pageSize, desc: query.sort === "modelCode,desc" };
      const rows = await this.models.list(tx, query, window);
      const totalItems = await this.models.count(tx, query);
      return {
        data: await this.views.listItems(tx, rows),
        meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
      };
    });
  }
}
