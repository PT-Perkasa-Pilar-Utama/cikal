import type { DedupOutcome } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { dedupCandidates, dedupMatrix, dedupResults } from "./schema.js";

export type DedupResultRow = typeof dedupResults.$inferSelect;
export type DedupCandidateRow = typeof dedupCandidates.$inferSelect;
export type DedupMatrixRowRecord = typeof dedupMatrix.$inferSelect;
export type DedupResultInsert = Omit<typeof dedupResults.$inferInsert, "tenantId" | "ranAt" | "outcome"> & {
  outcome: DedupOutcome;
};
export type DedupCandidateInsert = Omit<typeof dedupCandidates.$inferInsert, "tenantId" | "dedupResultId">;

/** Akses tabel `m06_dedup.dedup_results` dan `dedup_candidates` (technical-specs 06 §6.11 M06). */
@Injectable()
export class DedupResultsRepository {
  async findByProcess(tx: Tx, processInstanceId: string): Promise<DedupResultRow | null> {
    const [row] = await tx.select().from(dedupResults).where(eq(dedupResults.processInstanceId, processInstanceId));
    return row ?? null;
  }

  /** Hasil terbaru pengajuan, yaitu milik proses awal atau recontest terakhir yang sudah sampai DEDUP. */
  async findLatestByApplication(tx: Tx, applicationId: string): Promise<DedupResultRow | null> {
    const [row] = await tx
      .select()
      .from(dedupResults)
      .where(eq(dedupResults.applicationId, applicationId))
      .orderBy(desc(dedupResults.ranAt), desc(dedupResults.id))
      .limit(1);
    return row ?? null;
  }

  async candidatesOf(tx: Tx, dedupResultId: string): Promise<DedupCandidateRow[]> {
    return tx
      .select()
      .from(dedupCandidates)
      .where(eq(dedupCandidates.dedupResultId, dedupResultId))
      .orderBy(dedupCandidates.createdAt, dedupCandidates.id);
  }

  async matrixRow(tx: Tx, id: string): Promise<DedupMatrixRowRecord | null> {
    const [row] = await tx.select().from(dedupMatrix).where(eq(dedupMatrix.id, id));
    return row ?? null;
  }

  /**
   * Satu hasil per proses: retry manual langkah DEDUP menghitung ulang dan menggantikan hasil lama beserta
   * kandidatnya (cascade), karena data kandidat bisa sudah berubah sejak percobaan sebelumnya.
   */
  async replace(
    tx: Tx,
    tenantId: string,
    result: DedupResultInsert,
    candidates: readonly (DedupCandidateInsert & { id: string })[],
  ): Promise<void> {
    await tx.delete(dedupResults).where(eq(dedupResults.processInstanceId, result.processInstanceId));
    await tx.insert(dedupResults).values({ ...result, tenantId });
    if (candidates.length > 0) {
      await tx
        .insert(dedupCandidates)
        .values(candidates.map((candidate) => ({ ...candidate, tenantId, dedupResultId: result.id })));
    }
  }
}
