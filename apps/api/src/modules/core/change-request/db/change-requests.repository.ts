import type { ChangeRequestEntityType, ChangeRequestStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, inArray, type SQL, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { changeRequests, openStatusList } from "./schema.js";

export type ChangeRequestRow = typeof changeRequests.$inferSelect;
export type NewChangeRequest = Pick<
  typeof changeRequests.$inferInsert,
  "id" | "tenantId" | "entityType" | "entityId" | "action" | "oldData" | "newData" | "packageSize" | "submittedBy"
>;

export interface ChangeRequestFilter {
  entityTypes: readonly ChangeRequestEntityType[];
  statuses: readonly ChangeRequestStatus[];
  submittedBy?: string;
}

export interface PageRequest {
  offset: number;
  limit: number;
  direction: "asc" | "desc";
}

/** Akses tabel `cr.change_requests` (technical-specs 06 §6.8). */
@Injectable()
export class ChangeRequestsRepository {
  /**
   * Menyimpan permintaan baru; `false` bila data yang sama masih punya permintaan terbuka (AC-12.06).
   * Konflik dibaca dari indeks unik parsial sehingga dua Maker bersamaan tetap menghasilkan satu permintaan.
   */
  async insertOpen(tx: Tx, row: NewChangeRequest): Promise<boolean> {
    const inserted = await tx
      .insert(changeRequests)
      .values({ ...row, createdBy: row.submittedBy, updatedBy: row.submittedBy })
      .onConflictDoNothing({
        target: [changeRequests.tenantId, changeRequests.entityType, changeRequests.entityId],
        where: sql`${changeRequests.status} in (${openStatusList})`,
      })
      .returning({ id: changeRequests.id });
    return inserted.length > 0;
  }

  async findById(tx: Tx, id: string): Promise<ChangeRequestRow | null> {
    const [row] = await tx.select().from(changeRequests).where(eq(changeRequests.id, id));
    return row ?? null;
  }

  /** `SELECT ... FOR UPDATE`: Checker kedua menunggu sampai yang pertama selesai (AC-12.05). */
  async lockById(tx: Tx, id: string): Promise<ChangeRequestRow | null> {
    const [row] = await tx.select().from(changeRequests).where(eq(changeRequests.id, id)).for("update");
    return row ?? null;
  }

  async list(tx: Tx, filter: ChangeRequestFilter, page: PageRequest): Promise<ChangeRequestRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select()
      .from(changeRequests)
      .where(this.matching(filter))
      .orderBy(order(changeRequests.createdAt), order(changeRequests.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: ChangeRequestFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(changeRequests).where(this.matching(filter));
    return row?.total ?? 0;
  }

  /** Id data yang masih punya permintaan terbuka untuk salah satu jenis entity. */
  async openEntityIds(
    tx: Tx,
    entityTypes: readonly ChangeRequestEntityType[],
    entityIds: readonly string[],
  ): Promise<string[]> {
    if (entityIds.length === 0) return [];
    const rows = await tx
      .selectDistinct({ entityId: changeRequests.entityId })
      .from(changeRequests)
      .where(
        and(
          inArray(changeRequests.entityType, [...entityTypes]),
          inArray(changeRequests.entityId, [...entityIds]),
          sql`${changeRequests.status} in (${openStatusList})`,
        ),
      );
    return rows.flatMap((row) => (row.entityId ? [row.entityId] : []));
  }

  /** Ada permintaan terbuka yang `newData.<field>`-nya sama persis dengan `value`. */
  async hasOpenWithField(tx: Tx, entityType: ChangeRequestEntityType, field: string, value: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: changeRequests.id })
      .from(changeRequests)
      .where(
        and(
          eq(changeRequests.entityType, entityType),
          sql`${changeRequests.status} in (${openStatusList})`,
          sql`${changeRequests.newData} ->> ${field} = ${value}`,
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  async markReviewed(
    tx: Tx,
    id: string,
    review: { status: "APPROVED" | "REJECTED"; reviewedBy: string; reviewedAt: Date; entityId: string | null },
  ): Promise<void> {
    await tx
      .update(changeRequests)
      .set({ ...review, updatedAt: review.reviewedAt, updatedBy: review.reviewedBy })
      .where(eq(changeRequests.id, id));
  }

  private matching(filter: ChangeRequestFilter): SQL | undefined {
    return and(
      inArray(changeRequests.entityType, [...filter.entityTypes]),
      inArray(changeRequests.status, [...filter.statuses]),
      filter.submittedBy ? eq(changeRequests.submittedBy, filter.submittedBy) : undefined,
    );
  }
}
