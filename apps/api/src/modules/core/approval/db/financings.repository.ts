import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { financings, installments } from "./schema.js";

const financingColumns = {
  id: financings.id,
  applicationId: financings.applicationId,
  processInstanceId: financings.processInstanceId,
  approvalType: financings.approvalType,
  loanAmount: financings.loanAmount,
  tenor: financings.tenor,
  interestType: financings.interestType,
  interestRate: financings.interestRate,
  floatingRate: financings.floatingRate,
  capRate: financings.capRate,
  tenorFixed: financings.tenorFixed,
  adminFee: financings.adminFee,
  salesFee: financings.salesFee,
  provisionFee: financings.provisionFee,
  insuranceValue: financings.insuranceValue,
  netDisbursement: financings.netDisbursement,
  monthlyInstallment: financings.monthlyInstallment,
  dbrRatio: financings.dbrRatio,
  dsrRatio: financings.dsrRatio,
  formulaVersions: financings.formulaVersions,
  firstInstallmentDate: financings.firstInstallmentDate,
  sp3kNumber: financings.sp3kNumber,
};

const installmentColumns = {
  installmentNo: installments.installmentNo,
  dueDate: installments.dueDate,
  principalAmount: installments.principalAmount,
  interestAmount: installments.interestAmount,
  outstandingAmount: installments.outstandingAmount,
};

export type FinancingRow = Pick<typeof financings.$inferSelect, keyof typeof financingColumns>;
export type InstallmentRow = Pick<typeof installments.$inferSelect, keyof typeof installmentColumns>;

/** Akses tabel `approval.financings` dan `approval.installments` (technical-specs 06 §6.10). */
@Injectable()
export class FinancingsRepository {
  /** Struktur kredit baru menggantikan yang lama satu pengajuan; angsuran lama ikut terhapus (cascade). */
  async replace(
    tx: Tx,
    tenantId: string,
    financing: FinancingRow,
    schedule: InstallmentRow[],
    actorId: string | null,
  ): Promise<void> {
    const audit = { tenantId, createdBy: actorId, updatedBy: actorId };
    await tx.delete(financings).where(eq(financings.applicationId, financing.applicationId));
    await tx.insert(financings).values({ ...financing, ...audit });
    await tx
      .insert(installments)
      .values(schedule.map((row) => ({ ...row, ...audit, id: uuidv7(), financingId: financing.id })));
  }

  async findByApplication(
    tx: Tx,
    applicationId: string,
  ): Promise<{ financing: FinancingRow; schedule: InstallmentRow[] } | null> {
    const [financing] = await tx
      .select(financingColumns)
      .from(financings)
      .where(eq(financings.applicationId, applicationId));
    if (!financing) return null;
    const schedule = await tx
      .select(installmentColumns)
      .from(installments)
      .where(eq(installments.financingId, financing.id))
      .orderBy(asc(installments.installmentNo));
    return { financing, schedule };
  }
}
