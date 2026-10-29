import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { generatedDocuments } from "./schema.js";

export type NewGeneratedDocument = Omit<
  typeof generatedDocuments.$inferInsert,
  "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;

/** Akses tabel `document.generated_documents` (technical-specs 06 §6.8). */
@Injectable()
export class GeneratedDocumentsRepository {
  async insert(tx: Tx, row: NewGeneratedDocument, userId: string): Promise<void> {
    await tx.insert(generatedDocuments).values({ ...row, createdBy: userId, updatedBy: userId });
  }

  async findFileOwner(tx: Tx, fileId: string): Promise<{ id: string; applicationId: string } | null> {
    const [row] = await tx
      .select({ id: generatedDocuments.id, applicationId: generatedDocuments.applicationId })
      .from(generatedDocuments)
      .where(eq(generatedDocuments.fileId, fileId));
    return row ?? null;
  }
}
