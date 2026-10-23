import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationOccupations } from "./schema.js";
import type { SectionOwner } from "./section-owner.js";

export type ApplicationOccupationRow = typeof applicationOccupations.$inferSelect;
/** Field section Occupation; kunci tabel dan kolom audit diisi repository. */
export type ApplicationOccupationFields = Omit<
  typeof applicationOccupations.$inferInsert,
  "applicationId" | "tenantId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
>;

/** Akses tabel `application.application_occupations` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationOccupationsRepository {
  /** Simpan ulang mengganti seluruh field section Occupation. */
  async upsert(tx: Tx, owner: SectionOwner, fields: ApplicationOccupationFields, userId: string): Promise<void> {
    await tx
      .insert(applicationOccupations)
      .values({ ...owner, ...fields, createdBy: userId, updatedBy: userId })
      .onConflictDoUpdate({
        target: applicationOccupations.applicationId,
        set: { ...fields, updatedAt: new Date(), updatedBy: userId },
      });
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<ApplicationOccupationRow | null> {
    const [row] = await tx
      .select()
      .from(applicationOccupations)
      .where(eq(applicationOccupations.applicationId, applicationId));
    return row ?? null;
  }
}
