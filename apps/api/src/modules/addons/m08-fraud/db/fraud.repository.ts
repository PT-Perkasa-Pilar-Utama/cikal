import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { FraudMatrixRow, VelocityRule } from "../domain/fraud-rules.js";
import { blacklists, fraudMatrix, fraudResults, fraudVelocityRules } from "./schema.js";

export type FraudResultRow = typeof fraudResults.$inferSelect;
export type FraudResultInsert = Omit<typeof fraudResults.$inferInsert, "ranAt">;
export type BlacklistInsert = Omit<typeof blacklists.$inferInsert, "addedAt">;

/** Akses tabel `m08_fraud` (technical-specs 06 §6.11 M08). */
@Injectable()
export class FraudRepository {
  async matrix(tx: Tx): Promise<FraudMatrixRow[]> {
    return tx
      .select({
        id: fraudMatrix.id,
        priority: fraudMatrix.priority,
        nameCondition: fraudMatrix.nameCondition,
        ipCondition: fraudMatrix.ipCondition,
        fraudOutcome: fraudMatrix.fraudOutcome,
      })
      .from(fraudMatrix)
      .orderBy(asc(fraudMatrix.priority), asc(fraudMatrix.id));
  }

  async activeRules(tx: Tx): Promise<VelocityRule[]> {
    return tx
      .select({
        dimension: fraudVelocityRules.dimension,
        windowValue: fraudVelocityRules.windowValue,
        windowUnit: fraudVelocityRules.windowUnit,
        maxCount: fraudVelocityRules.maxCount,
        outcomeWhenExceeded: fraudVelocityRules.outcomeWhenExceeded,
      })
      .from(fraudVelocityRules)
      .where(eq(fraudVelocityRules.isActive, true))
      .orderBy(asc(fraudVelocityRules.id));
  }

  /**
   * Pemohon ada di blacklist bila NIK-nya (blind index) tercatat. IP tidak dicocokkan: kanal WEB memakai IP kantor
   * cabang, dan `ip_address` baru dipakai bila ada kanal self-service (grooming v2 R-02).
   */
  async isBlacklisted(tx: Tx, nikBlindIndex: Buffer): Promise<boolean> {
    const rows = await tx
      .select({ id: blacklists.id })
      .from(blacklists)
      .where(eq(blacklists.idCardNumberBidx, nikBlindIndex))
      .limit(1);
    return rows.length > 0;
  }

  async addToBlacklist(tx: Tx, entry: BlacklistInsert): Promise<void> {
    await tx.insert(blacklists).values(entry);
  }

  async findByProcess(tx: Tx, processInstanceId: string): Promise<FraudResultRow | null> {
    const [row] = await tx.select().from(fraudResults).where(eq(fraudResults.processInstanceId, processInstanceId));
    return row ?? null;
  }

  async matrixRow(tx: Tx, id: string): Promise<FraudMatrixRow | null> {
    const [row] = await tx
      .select({
        id: fraudMatrix.id,
        priority: fraudMatrix.priority,
        nameCondition: fraudMatrix.nameCondition,
        ipCondition: fraudMatrix.ipCondition,
        fraudOutcome: fraudMatrix.fraudOutcome,
      })
      .from(fraudMatrix)
      .where(eq(fraudMatrix.id, id));
    return row ?? null;
  }

  /** Satu hasil per proses: retry manual menghitung ulang dan mengganti hasil lama. */
  async replace(tx: Tx, row: FraudResultInsert): Promise<void> {
    await tx.delete(fraudResults).where(eq(fraudResults.processInstanceId, row.processInstanceId));
    await tx.insert(fraudResults).values(row);
  }
}
