import {
  type AdapterErrorCategory,
  adapterErrorCategories,
  type RegionSyncStatus,
  regionSyncStatusSchema,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { regionSyncs } from "./schema.js";

export interface RegionSyncRow {
  id: string;
  status: RegionSyncStatus;
  startedAt: Date;
  finishedAt: Date | null;
  addedCount: number | null;
  updatedCount: number | null;
  errorCategory: AdapterErrorCategory | null;
}

const errorCategorySchema = z.enum(adapterErrorCategories).nullable();

/** Akses tabel `masterdata.region_syncs` (api-specs 06 §6.3.3, §6.3.4). */
@Injectable()
export class RegionSyncsRepository {
  /** `false` bila sinkronisasi lain masih RUNNING (indeks unik `region_syncs_running_unique`). */
  async insertRunning(tx: Tx, id: string, startedAt: Date, userId: string): Promise<boolean> {
    const rows = await tx
      .insert(regionSyncs)
      .values({ id, status: "RUNNING", startedAt, createdBy: userId, updatedBy: userId })
      .onConflictDoNothing()
      .returning({ id: regionSyncs.id });
    return rows.length === 1;
  }

  /** Sinkronisasi RUNNING yang dimulai sebelum `before` dianggap gagal, contoh worker mati di tengah job. */
  async failStale(tx: Tx, before: Date): Promise<void> {
    await tx
      .update(regionSyncs)
      .set({ status: "FAILED", errorCategory: "TIMEOUT", finishedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(regionSyncs.status, "RUNNING"), lt(regionSyncs.startedAt, before)));
  }

  async complete(tx: Tx, id: string, added: number, updated: number, finishedAt: Date): Promise<void> {
    await tx
      .update(regionSyncs)
      .set({ status: "COMPLETED", addedCount: added, updatedCount: updated, finishedAt, updatedAt: finishedAt })
      .where(and(eq(regionSyncs.id, id), eq(regionSyncs.status, "RUNNING")));
  }

  async fail(tx: Tx, id: string, category: AdapterErrorCategory | null): Promise<void> {
    const now = new Date();
    await tx
      .update(regionSyncs)
      .set({ status: "FAILED", errorCategory: category, finishedAt: now, updatedAt: now })
      .where(and(eq(regionSyncs.id, id), eq(regionSyncs.status, "RUNNING")));
  }

  async find(tx: Tx, id: string): Promise<RegionSyncRow | null> {
    const [row] = await tx.select().from(regionSyncs).where(eq(regionSyncs.id, id));
    if (!row) return null;
    return {
      id: row.id,
      status: regionSyncStatusSchema.parse(row.status),
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      addedCount: row.addedCount,
      updatedCount: row.updatedCount,
      errorCategory: errorCategorySchema.parse(row.errorCategory),
    };
  }

  /** Waktu selesai sinkronisasi COMPLETED terakhir, atau `null` bila belum pernah. */
  async lastSyncAt(tx: Tx): Promise<Date | null> {
    const [row] = await tx
      .select({ finishedAt: regionSyncs.finishedAt })
      .from(regionSyncs)
      .where(eq(regionSyncs.status, "COMPLETED"))
      .orderBy(desc(regionSyncs.finishedAt))
      .limit(1);
    return row?.finishedAt ?? null;
  }
}
