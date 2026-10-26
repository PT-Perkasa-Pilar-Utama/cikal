import {
  SCORING_MODEL_MESSAGES,
  type ScoringModelCreate,
  type ScoringModelDetailResponse,
  type ScoringModelUpdate,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { DraftModels, headerOf } from "./draft-models.js";
import { ModelViews } from "./model-views.js";

/**
 * Header draft model (api-specs 22 §22.3): model baru versi 1, versi baru dari versi ACTIVE (satu draft per kode
 * model), dan ubah header. Versi ACTIVE tetap dipakai pengajuan sampai versi baru disetujui (AC-37.05).
 */
@Injectable()
export class SaveScoringModelUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly models: ScoringModelDraftsRepository,
    private readonly drafts: DraftModels,
    private readonly views: ModelViews,
  ) {}

  create(ctx: RequestContext, body: ScoringModelCreate): Promise<ScoringModelDetailResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if ((await this.models.versionsOf(tx, body.modelCode)).length > 0) {
        throw new DomainError("MODEL_CODE_EXISTS", SCORING_MODEL_MESSAGES.modelCodeExists, 409);
      }
      await this.drafts.assertProducts(tx, body.productIds);
      const id = uuidv7();
      const row = { id, modelCode: body.modelCode, versionNumber: 1, ...headerOf(body) };
      await this.models.insert(tx, ctx.tenantId, row, ctx.userId);
      await this.models.replaceProducts(tx, ctx.tenantId, id, body.productIds, ctx.userId, uuidv7);
      return this.detail(tx, id);
    });
  }

  /** Salinan header, produk, dan kriteria versi ACTIVE sebagai `DRAFT` versi berikutnya. */
  newVersion(ctx: RequestContext, activeId: string): Promise<ScoringModelDetailResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const active = await this.models.lock(tx, activeId);
      if (!active) throw DomainError.standard("NOT_FOUND");
      if (active.status !== "ACTIVE") throw DomainError.standard("INVALID_STATE");
      const versions = await this.models.versionsOf(tx, active.modelCode);
      if (versions.some((version) => version.status === "WAITING_APPROVAL")) {
        throw DomainError.standard("PENDING_CHANGE_REQUEST");
      }
      if (versions.some((version) => version.status === "DRAFT")) throw DomainError.standard("INVALID_STATE");
      const id = uuidv7();
      const versionNumber = (versions[0]?.versionNumber ?? 0) + 1;
      await this.models.insert(tx, ctx.tenantId, { ...active, id, versionNumber }, ctx.userId);
      const productIds = (await this.models.productIdsOf(tx, [active.id])).get(active.id) ?? [];
      await this.models.replaceProducts(tx, ctx.tenantId, id, productIds, ctx.userId, uuidv7);
      for (const criterion of await this.models.criteriaOf(tx, active.id)) {
        await this.models.insertCriterion(tx, ctx.tenantId, id, { ...criterion, id: uuidv7() }, ctx.userId);
      }
      return this.detail(tx, id);
    });
  }

  update(ctx: RequestContext, id: string, body: ScoringModelUpdate): Promise<ScoringModelDetailResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      await this.drafts.lockDraft(tx, id);
      await this.drafts.assertProducts(tx, body.productIds);
      await this.models.updateHeader(tx, id, headerOf(body), ctx.userId);
      await this.models.replaceProducts(tx, ctx.tenantId, id, body.productIds, ctx.userId, uuidv7);
      return this.detail(tx, id);
    });
  }

  private async detail(tx: Tx, id: string): Promise<ScoringModelDetailResponse> {
    const model = await this.models.findById(tx, id);
    if (!model) throw DomainError.standard("NOT_FOUND");
    return { data: await this.views.detail(tx, model) };
  }
}
