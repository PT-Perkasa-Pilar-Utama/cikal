import type { ValidityStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { disbursements } from "./schema.js";

const disbursementColumns = {
  id: disbursements.id,
  applicationId: disbursements.applicationId,
  processInstanceId: disbursements.processInstanceId,
  disbursementAmount: disbursements.disbursementAmount,
  disbursementDate: disbursements.disbursementDate,
  validityStatus: disbursements.validityStatus,
  notValidReason: disbursements.notValidReason,
  contractNumber: disbursements.contractNumber,
  contractDate: disbursements.contractDate,
};

export type DisbursementRow = Pick<typeof disbursements.$inferSelect, keyof typeof disbursementColumns>;

export interface ValidityResult {
  validityStatus: ValidityStatus;
  disbursementDate: string | null;
  notValidReason: string | null;
}

/** Akses tabel `m15_disbursement.disbursements` (technical-specs 06 §6.11 M15). */
@Injectable()
export class DisbursementsRepository {
  /**
   * Data pencairan proses yang sampai VALIDITY_CHECK. Proses baru sesudah kembali ke Draft memulai ulang
   * pemeriksaan, jadi hasil Validity Check lama dihapus.
   */
  async open(
    tx: Tx,
    row: { tenantId: string; applicationId: string; processInstanceId: string; disbursementAmount: string },
  ): Promise<void> {
    const reset = {
      processInstanceId: row.processInstanceId,
      disbursementAmount: row.disbursementAmount,
      disbursementDate: null,
      validityStatus: null,
      notValidReason: null,
      updatedAt: new Date(),
    };
    await tx
      .insert(disbursements)
      .values({ id: uuidv7(), ...row })
      .onConflictDoUpdate({ target: disbursements.applicationId, set: reset });
  }

  async findByApplication(tx: Tx, applicationId: string): Promise<DisbursementRow | null> {
    const [row] = await tx
      .select(disbursementColumns)
      .from(disbursements)
      .where(eq(disbursements.applicationId, applicationId));
    return row ?? null;
  }

  async recordValidity(tx: Tx, applicationId: string, result: ValidityResult, userId: string): Promise<void> {
    await tx
      .update(disbursements)
      .set({ ...result, updatedAt: new Date(), updatedBy: userId })
      .where(eq(disbursements.applicationId, applicationId));
  }
}
