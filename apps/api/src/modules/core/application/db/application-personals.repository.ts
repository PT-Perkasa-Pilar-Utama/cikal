import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationPersonals } from "./schema.js";

export type ApplicationPersonalRow = typeof applicationPersonals.$inferSelect;

/** Akses tabel `application.application_personals` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationPersonalsRepository {
  async insert(tx: Tx, row: typeof applicationPersonals.$inferInsert): Promise<void> {
    await tx.insert(applicationPersonals).values(row);
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<ApplicationPersonalRow | null> {
    const [row] = await tx
      .select()
      .from(applicationPersonals)
      .where(eq(applicationPersonals.applicationId, applicationId));
    return row ?? null;
  }
}
