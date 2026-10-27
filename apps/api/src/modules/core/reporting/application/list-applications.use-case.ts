import type { ApplicationInquiryQuery, ApplicationInquiryResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { BranchDirectory } from "../../organization/index.js";
import { ApplicationInquiryRepository, type InquiryRow } from "../db/application-inquiry.repository.js";
import { dateRangeError, inquirySort, maskIdCardNumber } from "../domain/inquiry-rules.js";

/**
 * "Application Inquiry" (api-specs 17 §17.1): pencarian, saringan, dan urutan di view Reporting, dibatasi lingkup
 * data user (TN-02). Klien memanggil ulang setiap 30 detik agar langkah baru tampil (AC-83.06).
 */
@Injectable()
export class ListApplicationsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly inquiry: ApplicationInquiryRepository,
    private readonly branches: BranchDirectory,
    private readonly encryption: TenantEncryption,
  ) {}

  execute(ctx: RequestContext, query: ApplicationInquiryQuery): Promise<ApplicationInquiryResponse> {
    const invalidRange = dateRangeError(query);
    if (invalidRange) throw invalidRange;
    const { field, direction } = inquirySort(query.sort);
    const page = { sort: field, direction, offset: (query.page - 1) * query.pageSize, limit: query.pageSize };
    return this.db.withTenantTx(ctx, async (tx) => {
      const { q, state, status, productId, branchId, submittedFrom, submittedTo } = query;
      const filter = {
        ...{ q, state, status, productId, branchId, submittedFrom, submittedTo },
        viewerId: ctx.userId,
        branches: await this.branches.dataScope(tx, ctx.userId),
      };
      const rows = await this.inquiry.list(tx, filter, page);
      const totalItems = await this.inquiry.count(tx, filter);
      return {
        data: await Promise.all(rows.map((row) => this.item(tx, row))),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
        },
      };
    });
  }

  private async item(tx: Tx, row: InquiryRow): Promise<ApplicationInquiryResponse["data"][number]> {
    const idCardNumber = await this.encryption.decrypt(tx, {
      ciphertext: row.idCardNumberEnc,
      keyVersion: row.idCardNumberKeyVersion,
    });
    return {
      id: row.id,
      loanId: row.loanId,
      fullName: row.fullName,
      idCardNumberMasked: maskIdCardNumber(idCardNumber),
      productCode: row.productCode,
      branchCode: row.branchCode,
      requestedLimit: row.requestedLimit,
      status: row.status,
      state: row.state,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      modifiedAt: row.modifiedAt.toISOString(),
    };
  }
}
