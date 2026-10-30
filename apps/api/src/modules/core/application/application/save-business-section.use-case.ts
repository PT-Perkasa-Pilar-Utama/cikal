import type { BusinessSectionInput, SectionSaveResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ApplicationBusinessesRepository } from "../db/application-businesses.repository.js";
import { addressColumns } from "../domain/address-fields.js";
import { DraftSections } from "./draft-sections.js";
import { StrictSections } from "./strict-sections.js";

/** Simpan section Business pemohon wiraswasta (api-specs 12 §12.3; AC-45.01 s.d. AC-45.05). */
@Injectable()
export class SaveBusinessSectionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sections: DraftSections,
    private readonly businesses: ApplicationBusinessesRepository,
    private readonly rules: StrictSections,
  ) {}

  execute(ctx: RequestContext, id: string, input: BusinessSectionInput, strict: boolean): Promise<SectionSaveResponse> {
    const today = businessDate(new Date());
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lockInSteps(tx, ctx, id, "business");
      const error = strict ? await this.rules.businessError(tx, draft, input, today) : null;
      if (error) throw error;
      await this.businesses.upsert(
        tx,
        { applicationId: draft.id, tenantId: ctx.tenantId },
        {
          businessName: input.businessName ?? null,
          businessField: input.businessField ?? null,
          phoneNumber: input.phoneNumber ?? null,
          email: input.email ?? null,
          annualSales: input.annualSales ?? null,
          businessNumber: input.businessNumber ?? null,
          businessLaunchDate: input.businessLaunchDate ?? null,
          characteristicOfFinancing: input.characteristicOfFinancing ?? null,
          typeOfFinancing: input.typeOfFinancing ?? null,
          typeOfUsage: input.typeOfUsage ?? null,
          categoryOfFinancing: input.categoryOfFinancing ?? null,
          relationshipWithBank: input.relationshipWithBank ?? null,
          ...addressColumns(input.address),
        },
        ctx.userId,
      );
      return this.sections.saved(tx, ctx, draft, "business", strict);
    });
  }
}
