import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationPersonals } from "./schema.js";

export type ApplicationPersonalRow = typeof applicationPersonals.$inferSelect;
/** Field section Personal; kunci tabel dan kolom audit pembuatan tidak berubah. */
export type PersonalChanges = Omit<
  typeof applicationPersonals.$inferInsert,
  "applicationId" | "tenantId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
>;

/** Akses tabel `application.application_personals` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationPersonalsRepository {
  async insert(tx: Tx, row: typeof applicationPersonals.$inferInsert): Promise<void> {
    await tx.insert(applicationPersonals).values(row);
  }

  async update(tx: Tx, applicationId: string, changes: PersonalChanges, userId: string): Promise<void> {
    await tx
      .update(applicationPersonals)
      .set({ ...changes, updatedAt: new Date(), updatedBy: userId })
      .where(eq(applicationPersonals.applicationId, applicationId));
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<ApplicationPersonalRow | null> {
    const [row] = await tx
      .select()
      .from(applicationPersonals)
      .where(eq(applicationPersonals.applicationId, applicationId));
    return row ?? null;
  }
}
