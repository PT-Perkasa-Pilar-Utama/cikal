import type { FinancingResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationProcess } from "../../application/index.js";
import { FinancingsRepository } from "../db/financings.repository.js";
import { applicationNotFound, financingNotAvailable } from "../domain/approval-errors.js";

/** Tab "Approval": struktur kredit dan jadwal angsuran setelah disetujui (api-specs 16 §16.7, AC-72.01, AC-74.01). */
@Injectable()
export class GetApplicationFinancingUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly financings: FinancingsRepository,
  ) {}

  execute(ctx: TenantContext, applicationId: string): Promise<FinancingResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.applications.find(tx, applicationId))) throw applicationNotFound();
      const found = await this.financings.findByApplication(tx, applicationId);
      if (!found) throw financingNotAvailable();
      const { financing, schedule } = found;
      return {
        data: {
          loanAmount: financing.loanAmount,
          tenor: financing.tenor,
          interestType: financing.interestType,
          interestRate: financing.interestRate,
          monthlyInstallment: financing.monthlyInstallment,
          adminFee: financing.adminFee,
          provisionFee: financing.provisionFee,
          insuranceValue: financing.insuranceValue,
          netDisbursement: financing.netDisbursement,
          dbrRatio: financing.dbrRatio,
          dsrRatio: financing.dsrRatio,
          firstInstallmentDate: financing.firstInstallmentDate,
          approvalType: financing.approvalType,
          sp3kNumber: financing.sp3kNumber,
          schedule,
        },
      };
    });
  }
}
