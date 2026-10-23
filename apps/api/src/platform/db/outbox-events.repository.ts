import { Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { outboxEvents } from "./schema.js";
import type { Tx } from "./tenant-tx.js";

export type OutboxEventRow = typeof outboxEvents.$inferSelect;

/** Akses tabel `platform.outbox_events` (technical-specs 06 §6.3). */
@Injectable()
export class OutboxEventsRepository {
  async insert(tx: Tx, row: typeof outboxEvents.$inferInsert): Promise<void> {
    await tx.insert(outboxEvents).values(row);
  }

  /** Mengunci event sampai pengiriman selesai agar dua worker tidak mengirimnya bersamaan. */
  async lock(tx: Tx, id: string): Promise<OutboxEventRow | null> {
    const [row] = await tx.select().from(outboxEvents).where(eq(outboxEvents.id, id)).for("update");
    return row ?? null;
  }

  async markPublished(tx: Tx, id: string): Promise<void> {
    await tx
      .update(outboxEvents)
      .set({ publishedAt: sql`now()`, attempts: sql`${outboxEvents.attempts} + 1`, updatedAt: sql`now()` })
      .where(eq(outboxEvents.id, id));
  }

  async countAttempt(tx: Tx, id: string): Promise<void> {
    await tx
      .update(outboxEvents)
      .set({ attempts: sql`${outboxEvents.attempts} + 1`, updatedAt: sql`now()` })
      .where(eq(outboxEvents.id, id));
  }
}
