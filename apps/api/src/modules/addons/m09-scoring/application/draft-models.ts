import type { ScoringModelUpdate } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ProductCodes } from "../../../core/product/index.js";
import {
  type ModelHeader,
  type ModelRow,
  ScoringModelDraftsRepository,
} from "../db/scoring-model-drafts.repository.js";

const SCORE_DECIMALS = 2;
const scoreOf = (value: string | null | undefined): string | null =>
  value === null || value === undefined ? null : new Decimal(value).toFixed(SCORE_DECIMALS);

/** Header model tersimpan dengan angka skor dua desimal. */
export function headerOf(input: ScoringModelUpdate): ModelHeader {
  return {
    modelName: input.modelName,
    modelGroup: input.modelGroup,
    constant: scoreOf(input.constant),
    cutOff: scoreOf(input.cutOff),
    reviewLowerBound: scoreOf(input.reviewLowerBound),
  };
}

/** Aturan bersama penyusunan draft (api-specs 22 §22.3): hanya versi `DRAFT` yang bisa diubah. */
@Injectable()
export class DraftModels {
  constructor(
    private readonly models: ScoringModelDraftsRepository,
    private readonly products: ProductCodes,
  ) {}

  /** Versi dikunci; tidak ada `NOT_FOUND`, bukan DRAFT `409 INVALID_STATE`. */
  async lockDraft(tx: Tx, id: string): Promise<ModelRow> {
    const model = await this.models.lock(tx, id);
    if (!model) throw DomainError.standard("NOT_FOUND");
    if (model.status !== "DRAFT") throw DomainError.standard("INVALID_STATE");
    return model;
  }

  /** Produk yang ditautkan wajib ada di tenant. */
  async assertProducts(tx: Tx, productIds: readonly string[]): Promise<void> {
    const found = await this.products.describe(tx, productIds);
    if (new Set(productIds).size !== found.size) throw DomainError.standard("NOT_FOUND");
  }
}
