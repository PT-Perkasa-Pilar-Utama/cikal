import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { DukcapilRule } from "../domain/dukcapil-rules.js";
import { dukcapilResults, dukcapilRules } from "./schema.js";

export type DukcapilResultRow = typeof dukcapilResults.$inferSelect;
export type DukcapilResultInsert = Omit<typeof dukcapilResults.$inferInsert, "ranAt">;

/** Akses tabel `m07_dukcapil.dukcapil_rules` dan `dukcapil_results` (technical-specs 06 §6.11 M07). */
@Injectable()
export class DukcapilRepository {
  async rule(tx: Tx): Promise<DukcapilRule | null> {
    const [row] = await tx
      .select({
        nameWeight: dukcapilRules.nameWeight,
        motherNameWeight: dukcapilRules.motherNameWeight,
        passedThreshold: dukcapilRules.passedThreshold,
        reviewThreshold: dukcapilRules.reviewThreshold,
        notFoundOutcome: dukcapilRules.notFoundOutcome,
      })
      .from(dukcapilRules);
    return row ?? null;
  }

  async findByProcess(tx: Tx, processInstanceId: string): Promise<DukcapilResultRow | null> {
    const [row] = await tx
      .select()
      .from(dukcapilResults)
      .where(eq(dukcapilResults.processInstanceId, processInstanceId));
    return row ?? null;
  }

  /** Satu hasil per proses: retry manual memanggil penyedia lagi dan mengganti hasil lama. */
  async replace(tx: Tx, row: DukcapilResultInsert): Promise<void> {
    await tx.delete(dukcapilResults).where(eq(dukcapilResults.processInstanceId, row.processInstanceId));
    await tx.insert(dukcapilResults).values(row);
  }
}
