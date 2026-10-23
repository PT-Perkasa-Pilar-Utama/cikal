import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { TenantContext, Tx } from "../../../../platform/db/tenant-tx.js";
import { LOAN_ID_MAX_SEQUENCE } from "../domain/loan-id.js";
import { loanIdCounters } from "./schema.js";

/** Akses tabel `application.loan_id_counters` (technical-specs 06 §6.9). */
@Injectable()
export class LoanIdCountersRepository {
  /**
   * Nomor berikutnya untuk produk di tenant `actor`, atau `null` bila counter sudah di batas. Satu pernyataan
   * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` mengunci baris counter, sehingga draft yang disimpan
   * bersamaan mendapat nomor berbeda dan berurutan (TRM_LID_006); produk pertama kali mulai dari 1.
   */
  async next(tx: Tx, actor: TenantContext, productCode: string): Promise<number | null> {
    const [row] = await tx
      .insert(loanIdCounters)
      .values({
        id: uuidv7(),
        tenantId: actor.tenantId,
        productCode,
        lastNumber: 1,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .onConflictDoUpdate({
        target: [loanIdCounters.tenantId, loanIdCounters.productCode],
        set: { lastNumber: sql`${loanIdCounters.lastNumber} + 1`, updatedAt: sql`now()`, updatedBy: actor.userId },
        setWhere: sql`${loanIdCounters.lastNumber} < ${LOAN_ID_MAX_SEQUENCE}`,
      })
      .returning({ lastNumber: loanIdCounters.lastNumber });
    return row?.lastNumber ?? null;
  }
}
