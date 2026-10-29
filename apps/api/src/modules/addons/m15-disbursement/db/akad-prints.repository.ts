import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { akadPrints } from "./schema.js";

export type NewAkadPrint = Omit<typeof akadPrints.$inferInsert, "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;

const printColumns = {
  generatedDocumentId: akadPrints.generatedDocumentId,
  fileId: akadPrints.fileId,
  printCount: akadPrints.printCount,
};
export type AkadPrintRow = Pick<typeof akadPrints.$inferSelect, keyof typeof printColumns>;

/** Akses tabel `m15_disbursement.akad_prints` (technical-specs 06 §6.11 M15). */
@Injectable()
export class AkadPrintsRepository {
  async insert(tx: Tx, row: NewAkadPrint, userId: string): Promise<void> {
    await tx.insert(akadPrints).values({ ...row, createdBy: userId, updatedBy: userId });
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<AkadPrintRow | null> {
    const [row] = await tx.select(printColumns).from(akadPrints).where(eq(akadPrints.applicationId, applicationId));
    return row ?? null;
  }

  async isAkadFile(tx: Tx, fileId: string): Promise<string | null> {
    const [row] = await tx
      .select({ applicationId: akadPrints.applicationId })
      .from(akadPrints)
      .where(eq(akadPrints.fileId, fileId));
    return row?.applicationId ?? null;
  }
}
