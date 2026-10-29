import type { AkadPrintRequest } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { GENERAL_PARAMETER_PORT, type GeneralParameterPort } from "../../../../platform/http/general-parameter-port.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { ApplicantNames, type ProcessApplication } from "../../../core/application/index.js";
import type { ApprovedFinancing } from "../../../core/approval/index.js";
import type { TemplateData } from "../../../core/document/index.js";
import { ProductCodes } from "../../../core/product/index.js";
import { dayMonthYear, percentText, rupiah } from "../domain/akad-format.js";
import { unavailableChoice } from "./disbursement-errors.js";

/** Kontrak akad yang sudah punya nomor. */
export interface AkadContract {
  contractNumber: string;
  contractDate: string;
}

/**
 * Isi placeholder template akad (api-specs 25 §25.3) dari pengajuan, struktur kredit yang disetujui, dan form Print
 * Akad. Metode pembayaran harus pilihan "Payment Method" aktif dan Risk Manager harus user aktif tenant.
 */
@Injectable()
export class AkadContents {
  constructor(
    private readonly names: ApplicantNames,
    private readonly products: ProductCodes,
    @Inject(GENERAL_PARAMETER_PORT) private readonly parameters: GeneralParameterPort,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  /** Pilihan form ditolak sebelum nomor kontrak dibentuk, sehingga nomor tidak terpakai sia-sia. */
  async checkChoices(tx: Tx, body: AkadPrintRequest): Promise<{ paymentMethod: string; riskManagerName: string }> {
    const methods = await this.parameters.options(tx, "Payment Method");
    const paymentMethod = methods.find((option) => option.paramId === body.paymentMethod)?.paramValue;
    if (!paymentMethod) throw unavailableChoice("paymentMethod", "Payment method");
    const riskManager = (await this.users.describe(tx, [body.riskManagerUserId])).get(body.riskManagerUserId);
    if (riskManager?.status !== "ACTIVE") throw unavailableChoice("riskManagerUserId", "Risk Manager");
    return { paymentMethod, riskManagerName: riskManager.fullName };
  }

  async data(
    tx: Tx,
    application: ProcessApplication,
    financing: ApprovedFinancing,
    contract: AkadContract,
    form: AkadPrintRequest & { paymentMethodLabel: string; riskManagerName: string },
  ): Promise<TemplateData> {
    const customerName = (await this.names.namesOf(tx, [application.id])).get(application.id) ?? "";
    const productName = (await this.products.name(tx, application.productId)) ?? "";
    return {
      contractNumber: contract.contractNumber,
      contractDate: dayMonthYear(contract.contractDate),
      loanId: application.loanId,
      customerName,
      productName,
      plafond: rupiah(financing.loanAmount),
      tenor: String(financing.tenor),
      interestRate: percentText(financing.interestRate),
      installment: rupiah(financing.monthlyInstallment),
      paymentMethod: form.paymentMethodLabel,
      bankAccountNumber: form.bankAccountNumber,
      customerAccountNumber: form.customerAccountNumber,
      riskManagerName: form.riskManagerName,
    };
  }
}
