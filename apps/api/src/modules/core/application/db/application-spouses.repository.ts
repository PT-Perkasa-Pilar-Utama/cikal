import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationSpouses } from "./schema.js";
import type { SectionOwner } from "./section-owner.js";

export type ApplicationSpouseRow = typeof applicationSpouses.$inferSelect;
/** Field section Spouse; kunci tabel dan kolom audit diisi repository. */
export type ApplicationSpouseFields = Omit<
  typeof applicationSpouses.$inferInsert,
  "applicationId" | "tenantId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
>;

/** Akses tabel `application.application_spouses` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationSpousesRepository {
  /** Simpan ulang mengganti seluruh field section Spouse. */
  async upsert(tx: Tx, owner: SectionOwner, fields: ApplicationSpouseFields, userId: string): Promise<void> {
    await tx
      .insert(applicationSpouses)
      .values({ ...owner, ...fields, createdBy: userId, updatedBy: userId })
      .onConflictDoUpdate({
        target: applicationSpouses.applicationId,
        set: { ...fields, updatedAt: new Date(), updatedBy: userId },
      });
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<ApplicationSpouseRow | null> {
    const [row] = await tx.select().from(applicationSpouses).where(eq(applicationSpouses.applicationId, applicationId));
    return row ?? null;
  }

  /** Data pasangan dihapus saat marital pemohon berubah menjadi tidak kawin (AC-43.04). */
  async deleteByApplication(tx: Tx, applicationId: string): Promise<void> {
    await tx.delete(applicationSpouses).where(eq(applicationSpouses.applicationId, applicationId));
  }
}
