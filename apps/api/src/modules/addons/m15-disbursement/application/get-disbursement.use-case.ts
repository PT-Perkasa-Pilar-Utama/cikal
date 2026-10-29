import type { CoreResponse, DisbursementDetailResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { ApprovedFinancings } from "../../../core/approval/index.js";
import { AkadPrintsRepository } from "../db/akad-prints.repository.js";
import { type CoreResponseRow, CoreResponsesRepository } from "../db/core-responses.repository.js";
import { type DisbursementRow, DisbursementsRepository } from "../db/disbursements.repository.js";
import { maskAccountNumber } from "../domain/akad-format.js";
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
    private readonly prints: AkadPrintsRepository,
    private readonly responses: CoreResponsesRepository,
    private readonly encryption: TenantEncryption,
  ) {}

  async execute(ctx: RequestContext, applicationId: string): Promise<DisbursementDetailResponse> {
    const allowed = await Promise.all(READERS.map(([menu, action]) => this.access.allows(ctx, menu, action)));
    if (!allowed.some(Boolean)) await this.access.authorize(ctx, "OPS-VALIDITY", "VIEW");
    const operations = allowed.slice(0, -1).some(Boolean);
    return this.db.withTenantTx(ctx, async (tx) => {
      const application = await this.applications.find(tx, applicationId);
      if (!application) throw applicationNotFound();
      const disbursement = await this.disbursements.findByApplication(tx, applicationId);
      const financing = await this.financings.find(tx, applicationId);
      if (!disbursement || !financing) throw DomainError.standard("NOT_FOUND");
      const print = await this.prints.findByApplication(tx, applicationId);
      const response = await this.responses.appliedFor(tx, disbursement.processInstanceId);
      return {
        data: {
          applicationId,
          loanId: application.loanId,
          currentStep: application.currentStep,
          disbursementAmount: disbursement.disbursementAmount,
          bankAccountNumber: await this.accountOf(tx, disbursement, operations),
          disbursementDate: disbursement.disbursementDate,
          firstInstallmentDate: financing.firstInstallmentDate,
          validityStatus: disbursement.validityStatus,
          notValidReason: disbursement.notValidReason,
          contractNumber: disbursement.contractNumber,
          contractDate: disbursement.contractDate,
          akadPrints: print ? [print] : [],
          coreResponse: response ? coreResponseOf(response) : null,
        },
      };
    });
  }

  /** Rekening nasabah dari Print Akad: utuh untuk menu `OPS-*`, tersamar untuk `APP-INQUIRY` saja (api-specs 25 §25.1). */
  private async accountOf(tx: Tx, disbursement: DisbursementRow, operations: boolean): Promise<string | null> {
    const { bankAccountNumberEnc, bankAccountNumberKeyVersion } = disbursement;
    if (!bankAccountNumberEnc || bankAccountNumberKeyVersion === null) return null;
    const account = await this.encryption.decrypt(tx, {
      ciphertext: bankAccountNumberEnc,
      keyVersion: bankAccountNumberKeyVersion,
    });
    return operations ? account : maskAccountNumber(account);
  }
}

/** Respons core proses saat ini dalam istilah halaman "Record Disbursement" (api-specs 25 §25.1, §25.4). */
function coreResponseOf(row: CoreResponseRow): CoreResponse {
  return {
    channel: row.channel,
    outcome: row.outcome,
    disbursementDate: row.disburseDate,
    coreLoanNumber: row.coreLoanAccount,
    cif: row.cif,
    failureReason: row.failureReason,
    recordedAt: row.createdAt.toISOString(),
  };
}
