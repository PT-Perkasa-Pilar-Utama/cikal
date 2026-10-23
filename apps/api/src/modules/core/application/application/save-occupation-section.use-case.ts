import type { OccupationSectionInput, SectionSaveResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { ApplicationOccupationsRepository } from "../db/application-occupations.repository.js";
import type { DraftRow } from "../db/applications.repository.js";
import { occupationSectionError } from "../domain/occupation-section-rules.js";
import { DraftSections } from "./draft-sections.js";

/** Simpan section Occupation (api-specs 12 §12.3; AC-44.01 s.d. AC-44.05). */
@Injectable()
export class SaveOccupationSectionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sections: DraftSections,
    private readonly occupations: ApplicationOccupationsRepository,
    @Inject(SYSTEM_PARAMETER_PORT) private readonly parameters: SystemParameterPort,
  ) {}

  execute(
    ctx: RequestContext,
    id: string,
    input: OccupationSectionInput,
    strict: boolean,
  ): Promise<SectionSaveResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lock(tx, ctx, id);
      if (strict) await this.checkStrict(tx, draft, input);
      const { company } = input;
      await this.occupations.upsert(
        tx,
        { applicationId: draft.id, tenantId: ctx.tenantId },
        {
          sourceOfIncome: input.sourceOfIncome ?? null,
          occupation: input.occupation ?? null,
          industryOfProfession: input.industryOfProfession ?? null,
          position: input.position ?? null,
          tenureAtCurrentJob: input.tenureAtCurrentJob ?? null,
          monthlyIncomeAllowance: input.monthlyIncomeAllowance ?? null,
          organization: input.organization ?? null,
          previousEmployer: input.previousEmployer ?? null,
          pensionInstance: input.pensionInstance ?? null,
          companyName: company.name ?? null,
          companyAddress: company.address ?? null,
          provinceCode: company.provinceCode ?? null,
          cityCode: company.cityCode ?? null,
          districtCode: company.districtCode ?? null,
          subDistrictCode: company.subDistrictCode ?? null,
          zipCode: company.zipCode ?? null,
          companyPhoneNumber: company.phoneNumber ?? null,
        },
        ctx.userId,
      );
      return this.sections.saved(tx, ctx, draft, "occupation", strict);
    });
  }

  private async checkStrict(tx: Tx, draft: DraftRow, input: OccupationSectionInput): Promise<void> {
    const error = occupationSectionError(input, {
      productCategory: draft.productCategory,
      employedIncomeSources: await this.parameters.choices(tx, "EMPLOYED_INCOME_SOURCES"),
      selfEmployedOnly: await this.parameters.flag(tx, "SELF_EMPLOYED_ONLY", draft.productId),
      selfEmployedOccupations: await this.parameters.choices(tx, "SELF_EMPLOYED_OCCUPATIONS"),
    });
    if (error) throw error;
  }
}
