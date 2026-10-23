import type { ApplicationSectionInput, SectionSaveResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { applicationRequiredError } from "../domain/application-section-rules.js";
import { applicationMinimum } from "../domain/draft-minimum.js";
import { ApplicationSectionChecks } from "./application-section-checks.js";
import { DraftSections } from "./draft-sections.js";

/**
 * Simpan section Application (api-specs 12 §12.3; AC-39.01 s.d. AC-39.03). Mengganti produk tidak mengubah Loan ID
 * (AC-49.03).
 */
@Injectable()
export class SaveApplicationSectionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sections: DraftSections,
    private readonly checks: ApplicationSectionChecks,
  ) {}

  execute(
    ctx: RequestContext,
    id: string,
    input: ApplicationSectionInput,
    strict: boolean,
  ): Promise<SectionSaveResponse> {
    const required = strict ? applicationRequiredError(input) : null;
    if (required) throw required;
    const minimum = applicationMinimum(input);
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lock(tx, ctx, id);
      const product = await this.checks.check(tx, input, strict, businessDate(new Date()));
      return this.sections.saved(tx, ctx, draft, "application", strict, {
        productCategory: product.productCategory,
        productId: product.id,
        applicationType: minimum.applicationType,
        segment: input.segment ?? null,
        purposeOfLoan: input.purposeOfLoan ?? null,
        tenorProposed: input.tenorProposed ?? null,
        requestedLimit: input.requestedLimit ?? null,
        insuranceId: input.insuranceId ?? null,
        sourceCode: input.sourceCode ?? null,
        salesCode: input.salesCode ?? null,
        referralCode: input.referralCode ?? null,
        marketingCode: input.marketingCode ?? null,
      });
    });
  }
}
