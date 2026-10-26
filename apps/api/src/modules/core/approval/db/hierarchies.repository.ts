import { Injectable } from "@nestjs/common";
import { and, eq, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { hierarchies } from "./schema.js";

export interface HierarchyRow {
  id: string;
  branchId: string;
  productId: string;
  jobLevel: number;
  subLevel: number;
  upLevel: number | null;
  upSubLevel: number | null;
  approverUserId: string;
  isActive: boolean;
}

export interface HierarchyFilter {
  branchId?: string;
  productId?: string;
  jobLevel?: number;
}

export type HierarchyAssignment = Pick<
  HierarchyRow,
  "branchId" | "productId" | "jobLevel" | "subLevel" | "approverUserId"
>;

const columns = {
  id: hierarchies.id,
  branchId: hierarchies.branchId,
  productId: hierarchies.productId,
  jobLevel: hierarchies.jobLevel,
  subLevel: hierarchies.subLevel,
  upLevel: hierarchies.upLevel,
  upSubLevel: hierarchies.upSubLevel,
  approverUserId: hierarchies.approverUserId,
  isActive: hierarchies.isActive,
};

/** Akses tabel `approval.hierarchies` (technical-specs 06 §6.10). */
@Injectable()
export class HierarchiesRepository {
  /** Semua baris yang cocok filter; diurutkan dan dipotong per halaman oleh use case karena kode cabang ada di Organization. */
  async list(tx: Tx, filter: HierarchyFilter): Promise<HierarchyRow[]> {
    return tx.select(columns).from(hierarchies).where(this.matching(filter));
  }

  async findById(tx: Tx, id: string): Promise<HierarchyRow | null> {
    const [row] = await tx.select(columns).from(hierarchies).where(eq(hierarchies.id, id));
    return row ?? null;
  }

  async findAssignment(tx: Tx, assignment: HierarchyAssignment): Promise<{ id: string } | null> {
    const [row] = await tx
      .select({ id: hierarchies.id })
      .from(hierarchies)
      .where(
        and(
          eq(hierarchies.branchId, assignment.branchId),
          eq(hierarchies.productId, assignment.productId),
          eq(hierarchies.jobLevel, assignment.jobLevel),
          eq(hierarchies.subLevel, assignment.subLevel),
          eq(hierarchies.approverUserId, assignment.approverUserId),
        ),
      );
    return row ?? null;
  }

  async insert(tx: Tx, tenantId: string, row: HierarchyRow, actorId: string): Promise<void> {
    await tx.insert(hierarchies).values({ ...row, tenantId, createdBy: actorId, updatedBy: actorId });
  }

  async update(tx: Tx, row: HierarchyRow, actorId: string): Promise<void> {
    const { id, ...fields } = row;
    await tx
      .update(hierarchies)
      .set({ ...fields, updatedAt: new Date(), updatedBy: actorId })
      .where(eq(hierarchies.id, id));
  }

  private matching(filter: HierarchyFilter): SQL | undefined {
    return and(
      filter.branchId ? eq(hierarchies.branchId, filter.branchId) : undefined,
      filter.productId ? eq(hierarchies.productId, filter.productId) : undefined,
      filter.jobLevel ? eq(hierarchies.jobLevel, filter.jobLevel) : undefined,
    );
  }
}
