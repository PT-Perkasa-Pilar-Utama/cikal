import type { CriterionInput, CriterionResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import type { Criterion } from "../domain/criteria.js";
import { CriterionChecks } from "./criterion-checks.js";
import { DraftModels } from "./draft-models.js";
import { ModelViews } from "./model-views.js";

/** Tambah, ubah, dan hapus kriteria draft (api-specs 22 §22.3, AC-37.01 s.d. AC-37.04). */
@Injectable()
export class EditCriteriaUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly models: ScoringModelDraftsRepository,
    private readonly drafts: DraftModels,
    private readonly checks: CriterionChecks,
    private readonly views: ModelViews,
  ) {}

  add(ctx: RequestContext, modelId: string, body: CriterionInput): Promise<CriterionResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      await this.drafts.lockDraft(tx, modelId);
      const criterion = { ...(await this.checks.checked(tx, body)), id: uuidv7() };
      await this.models.insertCriterion(tx, ctx.tenantId, modelId, criterion, ctx.userId);
      return this.view(tx, criterion);
    });
  }

  update(ctx: RequestContext, modelId: string, criterionId: string, body: CriterionInput): Promise<CriterionResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      await this.existing(tx, modelId, criterionId);
      const criterion = { ...(await this.checks.checked(tx, body)), id: criterionId };
      await this.models.updateCriterion(tx, criterion, ctx.userId);
      return this.view(tx, criterion);
    });
  }

  /** Menghapus baris draft, bukan data aktif (api-specs 22 §22.3). */
  remove(ctx: RequestContext, modelId: string, criterionId: string): Promise<void> {
    return this.db.withTenantTx(ctx, async (tx) => {
      await this.existing(tx, modelId, criterionId);
      await this.models.deleteCriterion(tx, criterionId);
    });
  }

  private async existing(tx: Tx, modelId: string, criterionId: string): Promise<void> {
    await this.drafts.lockDraft(tx, modelId);
    if (!(await this.models.findCriterion(tx, modelId, criterionId))) throw DomainError.standard("NOT_FOUND");
  }

  private async view(tx: Tx, criterion: Criterion): Promise<CriterionResponse> {
    const [view] = await this.views.criteria(tx, [criterion]);
    if (!view) throw DomainError.standard("NOT_FOUND");
    return { data: view };
  }
}
