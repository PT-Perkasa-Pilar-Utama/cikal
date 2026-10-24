import { type ApplicationDraftCreateRequest, type ApplicationDraftResponse, draftSavedMessage } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import { ApplicationsRepository } from "../db/applications.repository.js";
import { applicationRequiredError } from "../domain/application-section-rules.js";
import { draftMinimum } from "../domain/draft-minimum.js";
import { formSteps } from "../domain/form-steps.js";
import { ApplicationSectionChecks } from "./application-section-checks.js";
import { LoanIds } from "./loan-ids.js";

/**
 * Draft pertama dan Loan ID-nya dalam satu transaksi (api-specs 12 §12.2, technical-specs 05 §5.10 `saveDraft`):
 * nomor counter kembali bila penyimpanan gagal. NIK disimpan terenkripsi dan blind index (DM-08).
 * `strict=true` menjalankan aturan section Application (api-specs 12 §12.3) lalu memindahkan draft ke step Personal.
 */
@Injectable()
export class SaveDraftUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationsRepository,
    private readonly personals: ApplicationPersonalsRepository,
    private readonly checks: ApplicationSectionChecks,
    private readonly loanIds: LoanIds,
    private readonly encryption: TenantEncryption,
  ) {}

  execute(ctx: RequestContext, request: ApplicationDraftCreateRequest): Promise<ApplicationDraftResponse> {
    const required = request.strict ? applicationRequiredError(request.application) : null;
    if (required) throw required;
    const minimum = draftMinimum(request);
    const now = new Date();
    return this.db.withTenantTx(ctx, async (tx) => {
      const product = await this.checks.check(tx, request.application, request.strict, businessDate(now));
      const loanId = await this.loanIds.next(tx, ctx, product.productCode, now);
      const id = uuidv7();
      const currentSection = request.strict ? "personal" : "application";
      const { segment, purposeOfLoan, tenorProposed, requestedLimit, insuranceId } = request.application;
      await this.applications.insert(tx, {
        id,
        tenantId: ctx.tenantId,
        loanId,
        channel: "WEB",
        clientIpAddress: ctx.ipAddress,
        productCategory: product.productCategory,
        productId: product.id,
        applicationType: minimum.applicationType,
        segment,
        purposeOfLoan,
        tenorProposed,
        requestedLimit,
        insuranceId,
        currentSection,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      });
      const idCardNumber = await this.encryption.encrypt(tx, minimum.idCardNumber);
      await this.personals.insert(tx, {
        applicationId: id,
        tenantId: ctx.tenantId,
        fullName: minimum.fullName,
        fullNameId: minimum.fullNameId,
        idType: minimum.idType,
        idCardNumberEnc: idCardNumber.ciphertext,
        idCardNumberKeyVersion: idCardNumber.keyVersion,
        idCardNumberBidx: await this.encryption.blindIndex(tx, minimum.idCardNumber),
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      });
      return {
        data: { id, loanId, status: "DRAFT", currentSection, steps: formSteps() },
        ...(request.strict ? {} : { message: draftSavedMessage(loanId) }),
      };
    });
  }
}
