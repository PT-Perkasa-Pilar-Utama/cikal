import type { ScoringCriterion, ScoringModelDetail, ScoringModelListItem } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ProductCodes } from "../../../core/product/index.js";
import { type ModelRow, ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { type Criterion, displayTextOf } from "../domain/criteria.js";
import { VariableValuesResolver } from "./variable-values.js";

/** Bentuk respons model dan kriteria dengan teks server (api-specs 22 §22.1 s.d. §22.3, AC-37.01, AC-37.02). */
@Injectable()
export class ModelViews {
  constructor(
    private readonly models: ScoringModelDraftsRepository,
    private readonly products: ProductCodes,
    private readonly variables: VariableValuesResolver,
  ) {}

  async criteria(tx: Tx, criteria: readonly Criterion[]): Promise<ScoringCriterion[]> {
    const choiceLabel = await this.variables.choiceLabels(
      tx,
      new Set(criteria.map((criterion) => criterion.fieldCode)),
    );
    return criteria.map((criterion) => ({ ...criterion, displayText: displayTextOf(criterion, choiceLabel) }));
  }

  async detail(tx: Tx, model: ModelRow): Promise<ScoringModelDetail> {
    const productIds = (await this.models.productIdsOf(tx, [model.id])).get(model.id) ?? [];
    return {
      ...header(model),
      effectiveFrom: model.effectiveFrom?.toISOString() ?? null,
      productIds,
      criteria: await this.criteria(tx, await this.models.criteriaOf(tx, model.id)),
    };
  }

  async listItems(tx: Tx, models: readonly ModelRow[]): Promise<ScoringModelListItem[]> {
    const ids = models.map((model) => model.id);
    const productIds = await this.models.productIdsOf(tx, ids);
    const counts = await this.models.criteriaCounts(tx, ids);
    const codes = await this.products.describe(tx, [...productIds.values()].flat());
    return models.map((model) => ({
      ...header(model),
      products: (productIds.get(model.id) ?? []).map((id) => ({ id, productCode: codes.get(id) ?? id })),
      criteriaCount: counts.get(model.id) ?? 0,
    }));
  }
}

function header(model: ModelRow): Omit<ScoringModelListItem, "products" | "criteriaCount"> {
  const { id, modelCode, modelName, modelGroup, versionNumber, status, constant, cutOff, reviewLowerBound } = model;
  return { id, modelCode, modelName, modelGroup, versionNumber, status, constant, cutOff, reviewLowerBound };
}
