import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationBusinesses } from "./schema.js";
import type { SectionOwner } from "./section-owner.js";

export type ApplicationBusinessRow = typeof applicationBusinesses.$inferSelect;
/** Field section Business; kunci tabel dan kolom audit diisi repository. */
export type ApplicationBusinessFields = Omit<
  typeof applicationBusinesses.$inferInsert,
  "applicationId" | "tenantId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
>;

/** Akses tabel `application.application_businesses` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationBusinessesRepository {
  /** Simpan ulang mengganti seluruh field section Business. */
  async upsert(tx: Tx, owner: SectionOwner, fields: ApplicationBusinessFields, userId: string): Promise<void> {
    await tx
      .insert(applicationBusinesses)
      .values({ ...owner, ...fields, createdBy: userId, updatedBy: userId })
      .onConflictDoUpdate({
        target: applicationBusinesses.applicationId,
        set: { ...fields, updatedAt: new Date(), updatedBy: userId },
      });
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<ApplicationBusinessRow | null> {
    const [row] = await tx
      .select()
      .from(applicationBusinesses)
      .where(eq(applicationBusinesses.applicationId, applicationId));
    return row ?? null;
  }
}
