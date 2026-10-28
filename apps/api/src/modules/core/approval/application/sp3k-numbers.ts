import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { ProcessApplication } from "../../application/index.js";
import { DocumentNumbering } from "../../document/index.js";
import { BranchDirectory } from "../../organization/index.js";
import { ProductCodes } from "../../product/index.js";

/** Kode cabang pengajuan tanpa cabang (pembuatnya role pusat) untuk token `{BRANCH_CODE}` dan cakupan counter. */
export const HEAD_OFFICE_BRANCH_CODE = "000";

/**
 * Nomor SP3K saat level final menyetujui (api-specs 16 §16.6 langkah 7): hanya produk kategori COLLATERAL (KPR).
 * Nomor habis menggagalkan persetujuan sehingga SP3K tidak dibentuk (AC-102.06).
 */
@Injectable()
export class Sp3kNumbers {
  constructor(
    private readonly numbering: DocumentNumbering,
    private readonly branches: BranchDirectory,
    private readonly products: ProductCodes,
  ) {}

  async issue(tx: Tx, application: ProcessApplication, actorId: string | null): Promise<string | null> {
    if (application.productCategory !== "COLLATERAL") return null;
    const branchCode = application.branchId
      ? (await this.branches.describe(tx, [application.branchId])).get(application.branchId)?.branchCode
      : HEAD_OFFICE_BRANCH_CODE;
    if (!branchCode) throw new Error(`Branch ${application.branchId} does not exist`);
    const productCode = (await this.products.describe(tx, [application.productId])).get(application.productId);
    if (!productCode) throw new Error(`Product ${application.productId} does not exist`);
    return this.numbering.nextNumber(
      tx,
      "SP3K",
      {
        tenantId: application.tenantId,
        branchCode,
        productCode,
        date: businessDate(new Date()),
      },
      actorId,
    );
  }
}
