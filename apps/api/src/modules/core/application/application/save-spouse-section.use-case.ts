import type { SectionSaveResponse, SpouseSectionInput } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ApplicationSpousesRepository } from "../db/application-spouses.repository.js";
import { DraftSections } from "./draft-sections.js";
import { StrictSections } from "./strict-sections.js";

/**
 * Simpan section Spouse (api-specs 12 §12.3; AC-43.01, AC-43.02). Hanya untuk pemohon kawin; NIK pasangan disimpan
 * terenkripsi dan blind index (DM-08).
 */
@Injectable()
export class SaveSpouseSectionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sections: DraftSections,
    private readonly spouses: ApplicationSpousesRepository,
    private readonly rules: StrictSections,
    private readonly encryption: TenantEncryption,
  ) {}

  execute(ctx: RequestContext, id: string, input: SpouseSectionInput, strict: boolean): Promise<SectionSaveResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lockInSteps(tx, ctx, id, "spouse");
      const error = strict ? await this.rules.spouseError(tx, draft, input) : null;
      if (error) throw error;
      const idNumber = input.idNumber ? await this.encryption.encrypt(tx, input.idNumber) : null;
      const { idAddress, company } = input;
      await this.spouses.upsert(
        tx,
        { applicationId: draft.id, tenantId: ctx.tenantId },
        {
          fullName: input.fullName ?? null,
          idNumberEnc: idNumber?.ciphertext ?? null,
          idNumberKeyVersion: idNumber?.keyVersion ?? null,
          idNumberBidx: input.idNumber ? await this.encryption.blindIndex(tx, input.idNumber) : null,
          dateOfBirth: input.dateOfBirth ?? null,
          mobileNumber: input.mobileNumber ?? null,
          prenuptialAgreement: input.prenuptialAgreement ?? null,
          idExpiredDate: input.idExpiredDate ?? null,
          idAddress: idAddress.address ?? null,
          idRt: idAddress.rt ?? null,
          idRw: idAddress.rw ?? null,
          provinceCode: idAddress.provinceCode ?? null,
          cityCode: idAddress.cityCode ?? null,
          districtCode: idAddress.districtCode ?? null,
          subDistrictCode: idAddress.subDistrictCode ?? null,
          zipCode: idAddress.zipCode ?? null,
          occupation: input.occupation ?? null,
          industryOfProfession: input.industryOfProfession ?? null,
          position: input.position ?? null,
          sourceOfFunds: input.sourceOfFunds ?? null,
          monthlyIncome: input.monthlyIncome ?? null,
          monthlySpending: input.monthlySpending ?? null,
          companyName: company.name ?? null,
          companyAddress: company.address ?? null,
          companyProvinceCode: company.provinceCode ?? null,
          companyCityCode: company.cityCode ?? null,
          companyPhoneNumber: company.phoneNumber ?? null,
        },
        ctx.userId,
      );
      return this.sections.saved(tx, ctx, draft, "spouse", strict);
    });
  }
}
