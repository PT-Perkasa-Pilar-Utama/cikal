import type { ScoringModelListQuery } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, inArray, max, ne, type SQL, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Criterion } from "../domain/criteria.js";
import { type ModelGroup, type ModelStatus, scoringCriteria, scoringModelProducts, scoringModels } from "./schema.js";

export interface ModelHeader {
  modelName: string;
  modelGroup: ModelGroup;
  constant: string | null;
  cutOff: string | null;
  reviewLowerBound: string | null;
}

export interface ModelRow extends ModelHeader {
  id: string;
  modelCode: string;
  versionNumber: number;
  status: ModelStatus;
  effectiveFrom: Date | null;
}

const modelColumns = {
  id: scoringModels.id,
  modelCode: scoringModels.modelCode,
  modelName: scoringModels.modelName,
  modelGroup: scoringModels.modelGroup,
  versionNumber: scoringModels.versionNumber,
  status: scoringModels.status,
  constant: scoringModels.constant,
  cutOff: scoringModels.cutOff,
  reviewLowerBound: scoringModels.reviewLowerBound,
  effectiveFrom: scoringModels.effectiveFrom,
};

const criterionColumns = {
  id: scoringCriteria.id,
  fieldCode: scoringCriteria.fieldCode,
  operator: scoringCriteria.operator,
  value: scoringCriteria.value,
  weight: scoringCriteria.weight,
  criterionType: scoringCriteria.criterionType,
};

type ListFilter = Pick<ScoringModelListQuery, "modelGroup" | "productId" | "status">;

/** Penyusunan dan persetujuan versi model `m09_scoring` (api-specs 22 §22.1 s.d. §22.4). */
@Injectable()
export class ScoringModelDraftsRepository {
  async list(tx: Tx, filter: ListFilter, page: { offset: number; limit: number; desc: boolean }): Promise<ModelRow[]> {
    return tx
      .select(modelColumns)
      .from(scoringModels)
      .where(this.matching(filter))
      .orderBy(
        page.desc ? desc(scoringModels.modelCode) : asc(scoringModels.modelCode),
        asc(scoringModels.versionNumber),
      )
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: ListFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(scoringModels).where(this.matching(filter));
    return row?.total ?? 0;
  }

  async findById(tx: Tx, id: string): Promise<ModelRow | null> {
    const [row] = await tx.select(modelColumns).from(scoringModels).where(eq(scoringModels.id, id));
    return row ?? null;
  }

  /** Mengunci versi model sampai transaksi selesai, untuk perubahan draft dan persetujuan. */
  async lock(tx: Tx, id: string): Promise<ModelRow | null> {
    const [row] = await tx.select(modelColumns).from(scoringModels).where(eq(scoringModels.id, id)).for("update");
    return row ?? null;
  }

  /** Semua versi satu kode model, versi terbaru lebih dulu. */
  async versionsOf(tx: Tx, modelCode: string): Promise<ModelRow[]> {
    return tx
      .select(modelColumns)
      .from(scoringModels)
      .where(eq(scoringModels.modelCode, modelCode))
      .orderBy(desc(scoringModels.versionNumber));
  }

  async insert(
    tx: Tx,
    tenantId: string,
    row: Omit<ModelRow, "status" | "effectiveFrom">,
    actorId: string,
  ): Promise<void> {
    await tx
      .insert(scoringModels)
      .values({ ...row, tenantId, status: "DRAFT", createdBy: actorId, updatedBy: actorId });
  }

  async updateHeader(tx: Tx, id: string, header: ModelHeader, actorId: string): Promise<void> {
    await tx
      .update(scoringModels)
      .set({ ...header, updatedAt: new Date(), updatedBy: actorId })
      .where(eq(scoringModels.id, id));
  }

  async setStatus(
    tx: Tx,
    id: string,
    change: { status: ModelStatus; effectiveFrom?: Date | null },
    actorId: string | null,
  ): Promise<void> {
    await tx
      .update(scoringModels)
      .set({ ...change, updatedAt: new Date(), updatedBy: actorId })
      .where(eq(scoringModels.id, id));
  }

  /** Versi ACTIVE lain satu kode model menjadi SUPERSEDED saat versi baru aktif (technical-specs 06 §6.13). */
  async supersedeActive(tx: Tx, modelCode: string, exceptId: string, actorId: string | null): Promise<void> {
    await tx
      .update(scoringModels)
      .set({ status: "SUPERSEDED", updatedAt: new Date(), updatedBy: actorId })
      .where(
        and(eq(scoringModels.modelCode, modelCode), eq(scoringModels.status, "ACTIVE"), ne(scoringModels.id, exceptId)),
      );
  }

  async productIdsOf(tx: Tx, modelIds: readonly string[]): Promise<Map<string, string[]>> {
    if (modelIds.length === 0) return new Map();
    const rows = await tx
      .select({ modelId: scoringModelProducts.modelId, productId: scoringModelProducts.productId })
      .from(scoringModelProducts)
      .where(inArray(scoringModelProducts.modelId, [...modelIds]));
    const byModel = new Map<string, string[]>();
    for (const row of rows) byModel.set(row.modelId, [...(byModel.get(row.modelId) ?? []), row.productId]);
    return byModel;
  }

  async replaceProducts(
    tx: Tx,
    tenantId: string,
    modelId: string,
    productIds: readonly string[],
    actorId: string,
    newId: () => string,
  ): Promise<void> {
    await tx.delete(scoringModelProducts).where(eq(scoringModelProducts.modelId, modelId));
    if (productIds.length === 0) return;
    await tx.insert(scoringModelProducts).values(
      productIds.map((productId) => ({
        id: newId(),
        tenantId,
        modelId,
        productId,
        createdBy: actorId,
        updatedBy: actorId,
      })),
    );
  }

  async criteriaCounts(tx: Tx, modelIds: readonly string[]): Promise<Map<string, number>> {
    if (modelIds.length === 0) return new Map();
    const rows = await tx
      .select({ modelId: scoringCriteria.modelId, total: count() })
      .from(scoringCriteria)
      .where(inArray(scoringCriteria.modelId, [...modelIds]))
      .groupBy(scoringCriteria.modelId);
    return new Map(rows.map((row) => [row.modelId, row.total]));
  }

  async criteriaOf(tx: Tx, modelId: string): Promise<Criterion[]> {
    return tx
      .select(criterionColumns)
      .from(scoringCriteria)
      .where(eq(scoringCriteria.modelId, modelId))
      .orderBy(asc(scoringCriteria.sortOrder));
  }

  async findCriterion(tx: Tx, modelId: string, criterionId: string): Promise<Criterion | null> {
    const [row] = await tx
      .select(criterionColumns)
      .from(scoringCriteria)
      .where(and(eq(scoringCriteria.modelId, modelId), eq(scoringCriteria.id, criterionId)));
    return row ?? null;
  }

  /** Kriteria baru di urutan terakhir model. */
  async insertCriterion(
    tx: Tx,
    tenantId: string,
    modelId: string,
    criterion: Criterion,
    actorId: string,
  ): Promise<void> {
    const [last] = await tx
      .select({ sortOrder: max(scoringCriteria.sortOrder) })
      .from(scoringCriteria)
      .where(eq(scoringCriteria.modelId, modelId));
    await tx.insert(scoringCriteria).values({
      ...criterion,
      tenantId,
      modelId,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  async updateCriterion(tx: Tx, criterion: Criterion, actorId: string): Promise<void> {
    const { id, ...fields } = criterion;
    await tx
      .update(scoringCriteria)
      .set({ ...fields, updatedAt: new Date(), updatedBy: actorId })
      .where(eq(scoringCriteria.id, id));
  }

  async deleteCriterion(tx: Tx, criterionId: string): Promise<void> {
    await tx.delete(scoringCriteria).where(eq(scoringCriteria.id, criterionId));
  }

  private matching(filter: ListFilter): SQL | undefined {
    return and(
      inArray(scoringModels.status, filter.status),
      filter.modelGroup ? eq(scoringModels.modelGroup, filter.modelGroup) : undefined,
      filter.productId
        ? sql`exists (select 1 from ${scoringModelProducts} where ${scoringModelProducts.modelId} = ${scoringModels.id}
            and ${scoringModelProducts.productId} = ${filter.productId})`
        : undefined,
    );
  }
}
