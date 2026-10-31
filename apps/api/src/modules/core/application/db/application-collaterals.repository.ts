import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationCollaterals } from "./schema.js";
import type { SectionOwner } from "./section-owner.js";

export type ApplicationCollateralRow = typeof applicationCollaterals.$inferSelect;
/** Field section Collateral; kunci tabel dan kolom audit diisi repository. */
export type ApplicationCollateralFields = Omit<
  typeof applicationCollaterals.$inferInsert,
  "applicationId" | "tenantId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
>;

/** Akses tabel `application.application_collaterals` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationCollateralsRepository {
  /** Simpan ulang mengganti seluruh field section Collateral. */
  async upsert(tx: Tx, owner: SectionOwner, fields: ApplicationCollateralFields, userId: string): Promise<void> {
    await tx
      .insert(applicationCollaterals)
      .values({ ...owner, ...fields, createdBy: userId, updatedBy: userId })
      .onConflictDoUpdate({
        target: applicationCollaterals.applicationId,
        set: { ...fields, updatedAt: new Date(), updatedBy: userId },
      });
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<ApplicationCollateralRow | null> {
    const [row] = await tx
      .select()
      .from(applicationCollaterals)
      .where(eq(applicationCollaterals.applicationId, applicationId));
    return row ?? null;
  }
}
