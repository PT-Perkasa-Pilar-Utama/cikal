import { Injectable } from "@nestjs/common";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationDocuments, applications } from "./schema.js";
import type { SectionOwner } from "./section-owner.js";

export type ApplicationDocumentRow = typeof applicationDocuments.$inferSelect;

/** Akses tabel `application.application_documents` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationDocumentsRepository {
  async listByApplication(tx: Tx, applicationId: string): Promise<ApplicationDocumentRow[]> {
    return tx
      .select()
      .from(applicationDocuments)
      .where(and(eq(applicationDocuments.applicationId, applicationId), isNotNull(applicationDocuments.fileId)));
  }

  /** File baru menggantikan file lama di slot yang sama dan menunggu verifikasi lagi (AC-47.05). */
  async attach(
    tx: Tx,
    owner: SectionOwner,
    slot: { id: string; documentType: string; fileId: string },
    userId: string,
  ): Promise<void> {
    await tx
      .insert(applicationDocuments)
      .values({ ...owner, ...slot, createdBy: userId, updatedBy: userId })
      .onConflictDoUpdate({
        target: [applicationDocuments.applicationId, applicationDocuments.documentType],
        set: {
          fileId: slot.fileId,
          verificationStatus: "PENDING",
          verificationRemarks: null,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });
  }

  /** File terpasang di slot draft milik `createdBy` (aturan lihat file api-specs 10 §10.1). */
  async isOwnedFile(tx: Tx, fileId: string, createdBy: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: applicationDocuments.id })
      .from(applicationDocuments)
      .innerJoin(applications, eq(applications.id, applicationDocuments.applicationId))
      .where(and(eq(applicationDocuments.fileId, fileId), eq(applications.createdBy, createdBy)))
      .limit(1);
    return row !== undefined;
  }
}
