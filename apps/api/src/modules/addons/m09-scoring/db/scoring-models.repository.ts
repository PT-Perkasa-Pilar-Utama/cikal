import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Criterion } from "../domain/criteria.js";
import { type ModelGroup, scoringCriteria, scoringModelProducts, scoringModels } from "./schema.js";

export interface ActiveModel {
  id: string;
  modelCode: string;
  versionNumber: number;
  constant: string | null;
  cutOff: string | null;
  reviewLowerBound: string | null;
  criteria: Criterion[];
}

/** Akses tabel model `m09_scoring` (technical-specs 06 §6.11 M09). */
@Injectable()
export class ScoringModelsRepository {
  /** Versi ACTIVE terbaru kelompok `group` yang dipakai produk, beserta kriterianya urut `sort_order`. */
  async activeFor(tx: Tx, productId: string, group: ModelGroup): Promise<ActiveModel | null> {
    const [model] = await tx
      .select({
        id: scoringModels.id,
        modelCode: scoringModels.modelCode,
        versionNumber: scoringModels.versionNumber,
        constant: scoringModels.constant,
        cutOff: scoringModels.cutOff,
        reviewLowerBound: scoringModels.reviewLowerBound,
      })
      .from(scoringModels)
      .innerJoin(scoringModelProducts, eq(scoringModelProducts.modelId, scoringModels.id))
      .where(
        and(
          eq(scoringModelProducts.productId, productId),
          eq(scoringModels.modelGroup, group),
          eq(scoringModels.status, "ACTIVE"),
        ),
      )
      .orderBy(desc(scoringModels.versionNumber))
      .limit(1);
    if (!model) return null;
    const criteria = await tx
      .select({
        id: scoringCriteria.id,
        fieldCode: scoringCriteria.fieldCode,
        operator: scoringCriteria.operator,
        value: scoringCriteria.value,
        weight: scoringCriteria.weight,
        criterionType: scoringCriteria.criterionType,
      })
      .from(scoringCriteria)
      .where(eq(scoringCriteria.modelId, model.id))
      .orderBy(asc(scoringCriteria.sortOrder));
    return { ...model, criteria };
  }
}
