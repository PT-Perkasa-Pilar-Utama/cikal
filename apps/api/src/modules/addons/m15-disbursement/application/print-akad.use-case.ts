import type { AkadPrintRequest, AkadPrintResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import type { ProcessApplication } from "../../../core/application/index.js";
import { ApprovedFinancings } from "../../../core/approval/index.js";
import {
  akadDocumentCode,
  DocumentFiles,
  DocumentGenerator,
  DocumentNumbering,
  GeneratedDocuments,
  HEAD_OFFICE_BRANCH_CODE,
} from "../../../core/document/index.js";
import { BranchDirectory } from "../../../core/organization/index.js";
import { ProductCodes } from "../../../core/product/index.js";
import { AkadPrintsRepository } from "../db/akad-prints.repository.js";
import { DisbursementsRepository } from "../db/disbursements.repository.js";
import { AkadContents, type AkadContract } from "./akad-contents.js";
import { DisbursementTasks } from "./disbursement-tasks.js";

/**
 * Cetak "Surat Perjanjian Kredit" (api-specs 25 §25.3): nomor kontrak format CONTRACT sekali per pengajuan
 * (AC-102.08), template akad produk diisi lalu dikonversi ke PDF (AC-77.01), GeneratedDocument dan AkadPrint
 * disimpan, dan tugas PRINT_AKAD ditutup sehingga proses lanjut ke Disbursement.
 */
@Injectable()
export class PrintAkadUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly tasks: DisbursementTasks,
    private readonly financings: ApprovedFinancings,
    private readonly disbursements: DisbursementsRepository,
    private readonly prints: AkadPrintsRepository,
    private readonly contents: AkadContents,
    private readonly numbering: DocumentNumbering,
    private readonly generator: DocumentGenerator,
    private readonly generated: GeneratedDocuments,
    private readonly files: DocumentFiles,
    private readonly products: ProductCodes,
    private readonly branches: BranchDirectory,
    private readonly encryption: TenantEncryption,
  ) {}

  execute(ctx: RequestContext, applicationId: string, body: AkadPrintRequest): Promise<AkadPrintResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const working = await this.tasks.working(tx, ctx, applicationId, "PRINT_AKAD");
      const { application } = working;
      const choices = await this.contents.checkChoices(tx, body);
      const financing = await this.financings.find(tx, applicationId);
      if (!financing) throw new Error(`Application ${application.loanId} has no approved financing`);
      const productCode = (await this.products.describe(tx, [application.productId])).get(application.productId);
      if (!productCode) throw new Error(`Product ${application.productId} does not exist`);
      const contract = await this.contract(tx, ctx, application, productCode);
      const data = await this.contents.data(tx, application, financing, contract, {
        ...body,
        paymentMethodLabel: choices.paymentMethod,
        riskManagerName: choices.riskManagerName,
      });
      const documentCode = akadDocumentCode(productCode);
      const file = await this.generator.generate(tx, ctx, {
        documentCode,
        productId: application.productId,
        fileName: `Surat Perjanjian Kredit ${application.loanId}.pdf`,
        data,
      });
      const generatedDocumentId = await this.generated.record(tx, ctx, {
        applicationId,
        documentCode,
        documentNumber: contract.contractNumber,
        file,
        isReprint: false,
      });
      const customerAccount = await this.encryption.encrypt(tx, body.customerAccountNumber);
      await this.disbursements.setCustomerAccount(tx, applicationId, customerAccount, ctx.userId);
      await this.prints.insert(
        tx,
        {
          id: uuidv7(),
          tenantId: ctx.tenantId,
          applicationId,
          paymentMethod: body.paymentMethod,
          bankAccountNumber: body.bankAccountNumber,
          customerAccountNumberEnc: customerAccount.ciphertext,
          customerAccountNumberKeyVersion: customerAccount.keyVersion,
          riskManagerUserId: body.riskManagerUserId,
          generatedDocumentId,
          fileId: file.fileId,
          printCount: 1,
        },
        ctx.userId,
      );
      const nextStep = await this.tasks.close(tx, ctx, working, "PRINT_AKAD", { resultCode: "PRINTED", payload: {} });
      const link = await this.files.link(tx, file.fileId, "attachment");
      if (!link) throw new Error(`Generated file ${file.fileId} is missing`);
      return {
        data: {
          ...contract,
          generatedDocumentId,
          fileId: file.fileId,
          downloadUrl: link.url,
          expiresAt: link.expiresAt.toISOString(),
          nextStep,
        },
      };
    });
  }

  /** Nomor kontrak pertama dari format CONTRACT aktif; nomor yang sudah ada dipakai lagi (DN-06, AC-102.08). */
  private async contract(
    tx: Tx,
    ctx: RequestContext,
    application: ProcessApplication,
    productCode: string,
  ): Promise<AkadContract> {
    const disbursement = await this.disbursements.findByApplication(tx, application.id);
    if (!disbursement) throw new Error(`Application ${application.loanId} has no disbursement`);
    if (disbursement.contractNumber && disbursement.contractDate) {
      return { contractNumber: disbursement.contractNumber, contractDate: disbursement.contractDate };
    }
    const branchCode = application.branchId
      ? (await this.branches.describe(tx, [application.branchId])).get(application.branchId)?.branchCode
      : HEAD_OFFICE_BRANCH_CODE;
    if (!branchCode) throw new Error(`Branch ${application.branchId} does not exist`);
    const contractDate = businessDate(new Date());
    const contractNumber = await this.numbering.nextNumber(
      tx,
      "CONTRACT",
      { tenantId: ctx.tenantId, branchCode, productCode, date: contractDate },
      ctx.userId,
    );
    await this.disbursements.setContract(tx, application.id, { contractNumber, contractDate }, ctx.userId);
    return { contractNumber, contractDate };
  }
}
