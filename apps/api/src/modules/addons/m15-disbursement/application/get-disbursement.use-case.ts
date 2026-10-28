import type { DisbursementDetailResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { ApprovedFinancings } from "../../../core/approval/index.js";
import { DisbursementsRepository } from "../db/disbursements.repository.js";
import { applicationNotFound } from "./disbursement-errors.js";

const READERS = [
  ["OPS-VALIDITY", "VIEW"],
  ["OPS-PRINT-AKAD", "VIEW"],
  ["OPS-DISBURSEMENT", "VIEW"],
  ["APP-INQUIRY", "VIEW"],
] as const;

/**
 * "Disbursement Detail" untuk Validity Check, Print Akad, dan Record Disbursement (api-specs 25 §25.1). Rute memakai
 * `@Authenticated()` karena salah satu dari empat menu cukup; use case memeriksa semuanya.
 */
@Injectable()
export class GetDisbursementUseCase {
  constructor(
    private readonly db: TenantTx,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
    private readonly applications: ApplicationProcess,
    private readonly financings: ApprovedFinancings,
    private readonly disbursements: DisbursementsRepository,
  ) {}

  async execute(ctx: RequestContext, applicationId: string): Promise<DisbursementDetailResponse> {
    const allowed = await Promise.all(READERS.map(([menu, action]) => this.access.allows(ctx, menu, action)));
    if (!allowed.some(Boolean)) await this.access.authorize(ctx, "OPS-VALIDITY", "VIEW");
    return this.db.withTenantTx(ctx, async (tx) => {
      const application = await this.applications.find(tx, applicationId);
      if (!application) throw applicationNotFound();
      const disbursement = await this.disbursements.findByApplication(tx, applicationId);
      const financing = await this.financings.find(tx, applicationId);
      if (!disbursement || !financing) throw DomainError.standard("NOT_FOUND");
      return {
        data: {
          applicationId,
          loanId: application.loanId,
          currentStep: application.currentStep,
          disbursementAmount: disbursement.disbursementAmount,
          // Rekening nasabah diisi Print Akad di kartu BE-S6-02 (keputusan TL 2026-10-28).
          bankAccountNumber: null,
          disbursementDate: disbursement.disbursementDate,
          firstInstallmentDate: financing.firstInstallmentDate,
          validityStatus: disbursement.validityStatus,
          notValidReason: disbursement.notValidReason,
          contractNumber: disbursement.contractNumber,
          contractDate: disbursement.contractDate,
          // Riwayat cetak akad diisi kartu BE-S6-02; respons core diisi kartu BE-S6-03.
          akadPrints: [],
          coreResponse: null,
        },
      };
    });
  }
}
