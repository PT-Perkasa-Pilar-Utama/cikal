import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { OutcomeMapping } from "../domain/collectibility.js";
import { creditFacilities, outcomeMappings, results } from "./schema.js";

export type CreditBureauResultRow = typeof results.$inferSelect;
export type CreditFacilityRow = typeof creditFacilities.$inferSelect;
export type CreditBureauResultInsert = Omit<typeof results.$inferInsert, "ranAt">;
export type CreditFacilityInsert = Omit<typeof creditFacilities.$inferInsert, "tenantId" | "resultId">;

/** Akses tabel `m10_credit_bureau` (technical-specs 06 §6.11 M10). */
@Injectable()
export class CreditBureauRepository {
  async mappings(tx: Tx): Promise<OutcomeMapping[]> {
    return tx
      .select({
        collectibility: outcomeMappings.collectibility,
        quality: outcomeMappings.quality,
        outcome: outcomeMappings.outcome,
      })
      .from(outcomeMappings);
  }

  async findByProcess(tx: Tx, processInstanceId: string): Promise<CreditBureauResultRow | null> {
    const [row] = await tx.select().from(results).where(eq(results.processInstanceId, processInstanceId));
    return row ?? null;
  }

  async facilitiesOf(tx: Tx, resultId: string): Promise<CreditFacilityRow[]> {
    return tx
      .select()
      .from(creditFacilities)
      .where(eq(creditFacilities.resultId, resultId))
      .orderBy(creditFacilities.createdAt, creditFacilities.id);
  }

  /** Satu hasil per proses: retry manual memanggil penyedia lagi dan mengganti hasil lama beserta fasilitasnya. */
  async replace(
    tx: Tx,
    result: CreditBureauResultInsert,
    facilities: readonly (CreditFacilityInsert & { id: string })[],
  ): Promise<void> {
    await tx.delete(results).where(eq(results.processInstanceId, result.processInstanceId));
    await tx.insert(results).values(result);
    if (facilities.length > 0) {
      await tx
        .insert(creditFacilities)
        .values(facilities.map((facility) => ({ ...facility, tenantId: result.tenantId, resultId: result.id })));
    }
  }
}
