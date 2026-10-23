import type { Insurance } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { insurances } from "./schema.js";

/** Akses tabel `masterdata.insurances` (technical-specs 06 §6.6). */
@Injectable()
export class InsurancesRepository {
  async list(tx: Tx, includeInactive: boolean): Promise<Insurance[]> {
    return tx
      .select({
        id: insurances.id,
        insuranceCode: insurances.insuranceCode,
        insuranceName: insurances.insuranceName,
        isActive: insurances.isActive,
      })
      .from(insurances)
      .where(includeInactive ? undefined : eq(insurances.isActive, true))
      .orderBy(asc(insurances.insuranceName), asc(insurances.insuranceCode));
  }

  /** Asuransi aktif tenant transaksi; `false` bila tidak ada, nonaktif, atau milik tenant lain (RLS). */
  async isActive(tx: Tx, id: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: insurances.id })
      .from(insurances)
      .where(and(eq(insurances.id, id), eq(insurances.isActive, true)));
    return row !== undefined;
  }
}
