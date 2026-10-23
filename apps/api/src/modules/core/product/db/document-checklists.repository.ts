import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, type SQL, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { documentChecklistItems, documentChecklists, products } from "./schema.js";

export interface ChecklistItemRow {
  documentType: string;
  isMandatory: boolean;
}

export interface ChecklistCombination {
  productId: string;
  occupation: string;
  marital: string;
}

export interface ChecklistRow extends ChecklistCombination {
  id: string;
  productCode: string;
  productName: string;
  isActive: boolean;
  /** Urut seperti diajukan Maker. */
  items: ChecklistItemRow[];
}

export type ChecklistFilter = Partial<ChecklistCombination>;

const checklistColumns = {
  id: documentChecklists.id,
  productId: documentChecklists.productId,
  productCode: products.productCode,
  productName: products.productName,
  occupation: documentChecklists.occupation,
  marital: documentChecklists.marital,
  isActive: documentChecklists.isActive,
};

function matching(filter: ChecklistFilter): SQL | undefined {
  return and(
    filter.productId ? eq(documentChecklists.productId, filter.productId) : undefined,
    filter.occupation ? eq(documentChecklists.occupation, filter.occupation) : undefined,
    filter.marital ? eq(documentChecklists.marital, filter.marital) : undefined,
  );
}

/** Akses tabel `product.document_checklists` dan `product.document_checklist_items` (technical-specs 06 §6.7). */
@Injectable()
export class DocumentChecklistsRepository {
  async list(tx: Tx, filter: ChecklistFilter, page: { offset: number; limit: number }): Promise<ChecklistRow[]> {
    const rows = await tx
      .select(checklistColumns)
      .from(documentChecklists)
      .innerJoin(products, eq(products.id, documentChecklists.productId))
      .where(matching(filter))
      .orderBy(asc(products.productName), asc(documentChecklists.occupation), asc(documentChecklists.marital))
      .offset(page.offset)
      .limit(page.limit);
    return this.withItems(tx, rows);
  }

  async count(tx: Tx, filter: ChecklistFilter): Promise<number> {
    const [row] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(documentChecklists)
      .where(matching(filter));
    return row?.total ?? 0;
  }

  async findById(tx: Tx, id: string): Promise<ChecklistRow | null> {
    const rows = await tx
      .select(checklistColumns)
      .from(documentChecklists)
      .innerJoin(products, eq(products.id, documentChecklists.productId))
      .where(eq(documentChecklists.id, id));
    const [row] = await this.withItems(tx, rows);
    return row ?? null;
  }

  /** Kombinasi sudah dipakai checklist lain, aktif atau tidak, karena UQ berlaku untuk keduanya (AC-25.03). */
  async combinationExists(tx: Tx, combination: ChecklistCombination): Promise<boolean> {
    const [row] = await tx
      .select({ id: documentChecklists.id })
      .from(documentChecklists)
      .where(matching(combination))
      .limit(1);
    return row !== undefined;
  }

  async insert(
    tx: Tx,
    row: ChecklistCombination & { id: string; tenantId: string; isActive: boolean; items: ChecklistItemRow[] },
    userId: string,
  ): Promise<void> {
    const { items, ...checklist } = row;
    await tx.insert(documentChecklists).values({ ...checklist, createdBy: userId, updatedBy: userId });
    await this.insertItems(tx, { tenantId: row.tenantId, checklistId: row.id, userId }, items);
  }

  /** Isi checklist diganti seluruhnya; kombinasinya tetap. */
  async update(
    tx: Tx,
    id: string,
    changes: { tenantId: string; isActive: boolean; items: ChecklistItemRow[] },
    userId: string,
  ): Promise<void> {
    await tx
      .update(documentChecklists)
      .set({ isActive: changes.isActive, updatedAt: new Date(), updatedBy: userId })
      .where(eq(documentChecklists.id, id));
    await tx.delete(documentChecklistItems).where(eq(documentChecklistItems.checklistId, id));
    await this.insertItems(tx, { tenantId: changes.tenantId, checklistId: id, userId }, changes.items);
  }

  private async insertItems(
    tx: Tx,
    owner: { tenantId: string; checklistId: string; userId: string },
    items: ChecklistItemRow[],
  ): Promise<void> {
    if (items.length === 0) return;
    // uuid v7 berurutan, jadi urutan id sama dengan urutan Maker.
    await tx.insert(documentChecklistItems).values(
      items.map((item) => ({
        id: uuidv7(),
        tenantId: owner.tenantId,
        checklistId: owner.checklistId,
        documentType: item.documentType,
        isMandatory: item.isMandatory,
        createdBy: owner.userId,
        updatedBy: owner.userId,
      })),
    );
  }

  private async withItems(tx: Tx, rows: Omit<ChecklistRow, "items">[]): Promise<ChecklistRow[]> {
    if (rows.length === 0) return [];
    const items = await tx
      .select({
        checklistId: documentChecklistItems.checklistId,
        documentType: documentChecklistItems.documentType,
        isMandatory: documentChecklistItems.isMandatory,
      })
      .from(documentChecklistItems)
      .where(
        inArray(
          documentChecklistItems.checklistId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(documentChecklistItems.id));
    return rows.map((row) => ({
      ...row,
      items: items
        .filter((item) => item.checklistId === row.id)
        .map(({ documentType, isMandatory }) => ({ documentType, isMandatory })),
    }));
  }
}
