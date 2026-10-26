import type { ScoringModelChangeData } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { type ModelRow, ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { ModelViews } from "./model-views.js";

export const SCORING_MODEL_ENTITY_TYPE = "SCORING_MODEL";

/** `newData` dan `oldData` ChangeRequest `SCORING_MODEL`: versi beserta teks kriterianya (api-specs 07 §7.2). */
@Injectable()
export class ScoringModelChanges {
  constructor(
    private readonly models: ScoringModelDraftsRepository,
    private readonly views: ModelViews,
  ) {}

  async dataOf(tx: Tx, model: ModelRow, effectiveFrom: Date | null): Promise<ScoringModelChangeData> {
    const productIds = (await this.models.productIdsOf(tx, [model.id])).get(model.id) ?? [];
    const criteria = await this.views.criteria(tx, await this.models.criteriaOf(tx, model.id));
    return {
      modelId: model.id,
      modelCode: model.modelCode,
      modelName: model.modelName,
      modelGroup: model.modelGroup,
      versionNumber: model.versionNumber,
      effectiveFrom: effectiveFrom?.toISOString() ?? null,
      constant: model.constant,
      cutOff: model.cutOff,
      reviewLowerBound: model.reviewLowerBound,
      productIds,
      criteria: criteria.map((criterion) => criterion.displayText),
    };
  }
}
