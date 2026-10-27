import type { VerificationResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { documentVerifications } from "./schema.js";

export interface VerificationRecord {
  tenantId: string;
  applicationId: string;
  processInstanceId: string;
  verifierUserId: string;
  result: VerificationResult;
  submittedAt: Date | null;
}

/** Akses tabel `verification.document_verifications` (technical-specs 06 §6.10). */
@Injectable()
export class DocumentVerificationsRepository {
  /** Satu baris per ProcessInstance; simpan ulang dan submit memperbarui baris yang sama. */
  async save(tx: Tx, record: VerificationRecord): Promise<void> {
    const { verifierUserId, result, submittedAt } = record;
    await tx
      .insert(documentVerifications)
      .values({ ...record, id: uuidv7(), createdBy: verifierUserId, updatedBy: verifierUserId })
      .onConflictDoUpdate({
        target: documentVerifications.processInstanceId,
        set: { verifierUserId, result, submittedAt, updatedAt: new Date(), updatedBy: verifierUserId },
      });
  }
}
