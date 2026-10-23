import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationEmergencyContacts } from "./schema.js";
import type { SectionOwner } from "./section-owner.js";

export type ApplicationEmergencyContactRow = typeof applicationEmergencyContacts.$inferSelect;
/** Field section Emergency Contact; kunci tabel dan kolom audit diisi repository. */
export type ApplicationEmergencyContactFields = Omit<
  typeof applicationEmergencyContacts.$inferInsert,
  "applicationId" | "tenantId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
>;

/** Akses tabel `application.application_emergency_contacts` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationEmergencyContactsRepository {
  /** Simpan ulang mengganti seluruh field section Emergency Contact. */
  async upsert(tx: Tx, owner: SectionOwner, fields: ApplicationEmergencyContactFields, userId: string): Promise<void> {
    await tx
      .insert(applicationEmergencyContacts)
      .values({ ...owner, ...fields, createdBy: userId, updatedBy: userId })
      .onConflictDoUpdate({
        target: applicationEmergencyContacts.applicationId,
        set: { ...fields, updatedAt: new Date(), updatedBy: userId },
      });
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<ApplicationEmergencyContactRow | null> {
    const [row] = await tx
      .select()
      .from(applicationEmergencyContacts)
      .where(eq(applicationEmergencyContacts.applicationId, applicationId));
    return row ?? null;
  }
}
