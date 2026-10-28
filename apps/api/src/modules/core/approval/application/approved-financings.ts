import { isoDate } from "@cikal/formula";
import { Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CalculationApi } from "../../calculation/index.js";
import { FinancingsRepository } from "../db/financings.repository.js";

const MONEY_SCALE = 2;
const money = (value: Decimal): string => value.toFixed(MONEY_SCALE);

/** Ringkasan struktur kredit yang disetujui untuk langkah pencairan (api-specs 25 §25.1). */
export interface ApprovedFinancing {
  netDisbursement: string;
  firstInstallmentDate: string;
}

/**
 * Struktur kredit yang disetujui untuk modul lain (technical-specs 05 §5.14), di transaksi pemanggil: dibaca M15 dan
 * dijadwal ulang saat Validity Check mengubah First Installment Date (AC-76.05).
 */
@Injectable()
export class ApprovedFinancings {
  constructor(
    private readonly financings: FinancingsRepository,
    private readonly calculation: CalculationApi,
  ) {}

  async find(tx: Tx, applicationId: string): Promise<ApprovedFinancing | null> {
    const found = await this.financings.findByApplication(tx, applicationId);
    if (!found) return null;
    return {
      netDisbursement: found.financing.netDisbursement,
      firstInstallmentDate: found.financing.firstInstallmentDate,
    };
  }

  /**
   * Semua jatuh tempo bergeser ke tanggal `firstInstallmentDate` setiap bulan dan jadwal dihitung ulang dengan
   * plafon, tenor, dan suku bunga yang disetujui (api-specs 25 §25.2 langkah 3).
   */
  async reschedule(
    tx: Tx,
    target: { tenantId: string; applicationId: string; productId: string },
    firstInstallmentDate: string,
    actorId: string | null,
  ): Promise<void> {
    const found = await this.financings.findByApplication(tx, target.applicationId);
    if (!found) throw new Error(`Application ${target.applicationId} has no financing`);
    const { financing } = found;
    if (financing.interestType !== "FLAT" && financing.interestType !== "EFFECTIVE") {
      throw new Error(`Interest type ${financing.interestType} has no installment formula in the POC`);
    }
    const schedule = await this.calculation.schedule(
      { ...target, processInstanceId: financing.processInstanceId },
      {
        interestType: financing.interestType,
        principal: new Decimal(financing.loanAmount),
        tenor: financing.tenor,
        interestRate: new Decimal(financing.interestRate),
        firstInstallmentDate: new Date(`${firstInstallmentDate}T00:00:00Z`),
      },
    );
    await this.financings.replaceSchedule(
      tx,
      target.tenantId,
      financing.id,
      { firstInstallmentDate, monthlyInstallment: money(schedule.monthlyInstallment) },
      schedule.rows.map((row) => ({
        installmentNo: row.installmentNo,
        dueDate: isoDate(row.dueDate),
        principalAmount: money(row.principalAmount),
        interestAmount: money(row.interestAmount),
        outstandingAmount: money(row.outstandingAmount),
      })),
      actorId,
    );
  }
}
