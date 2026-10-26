import type { ScoringModelDetailResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { ModelViews } from "./model-views.js";

/** Detail versi model dengan kriterianya (api-specs 22 §22.2). */
@Injectable()
export class GetScoringModelUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly models: ScoringModelDraftsRepository,
    private readonly views: ModelViews,
  ) {}

  execute(ctx: TenantContext, id: string): Promise<ScoringModelDetailResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const model = await this.models.findById(tx, id);
      if (!model) throw DomainError.standard("NOT_FOUND");
      return { data: await this.views.detail(tx, model) };
    });
  }
}
