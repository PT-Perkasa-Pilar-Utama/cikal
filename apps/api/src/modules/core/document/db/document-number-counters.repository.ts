import { Injectable } from "@nestjs/common";
import { and, eq, lt, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { documentNumberCounters } from "./schema.js";

export interface CounterKey {
  tenantId: string;
  formatId: string;
  scopeKey: string;
  periodKey: string;
}

/** Akses tabel `document.document_number_counters` (technical-specs 06 §6.8). */
@Injectable()
export class DocumentNumberCountersRepository {
  /**
   * Nomor urut berikutnya (api-specs 10 §10.6). Baris counter periode baru dibuat dengan 0 (AC-102.03); `UPDATE ...
   * RETURNING` mengunci baris sehingga permintaan bersamaan mendapat nomor berbeda dan berurutan (AC-102.07).
   * `null` bila nomor sudah mencapai `capacity`; counter tidak berubah (AC-102.06).
   */
  async next(tx: Tx, key: CounterKey, capacity: number, userId: string | null): Promise<number | null> {
    await tx
      .insert(documentNumberCounters)
      .values({ id: uuidv7(), ...key, lastNumber: 0, createdBy: userId, updatedBy: userId })
      .onConflictDoNothing();
    const [row] = await tx
      .update(documentNumberCounters)
      .set({ lastNumber: sql`${documentNumberCounters.lastNumber} + 1`, updatedAt: new Date(), updatedBy: userId })
      .where(
        and(
          eq(documentNumberCounters.formatId, key.formatId),
          eq(documentNumberCounters.scopeKey, key.scopeKey),
          eq(documentNumberCounters.periodKey, key.periodKey),
          lt(documentNumberCounters.lastNumber, capacity),
        ),
      )
      .returning({ lastNumber: documentNumberCounters.lastNumber });
    return row?.lastNumber ?? null;
  }
}
