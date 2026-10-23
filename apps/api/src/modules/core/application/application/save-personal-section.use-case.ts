import type { PersonalSectionInput, SectionSaveResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ApplicationAddressesRepository } from "../db/application-addresses.repository.js";
import { ApplicationPersonalsRepository, type PersonalChanges } from "../db/application-personals.repository.js";
import { addressColumns } from "../domain/address-fields.js";
import { type PersonalMinimum, personalMinimum } from "../domain/draft-minimum.js";
import { DraftSections } from "./draft-sections.js";
import { StrictSections } from "./strict-sections.js";

/**
 * Simpan section Personal (api-specs 12 §12.3; AC-40.01 s.d. AC-40.10). NIK, nama ibu kandung, NPWP, dan KK
 * disimpan terenkripsi, NIK juga blind index (DM-08). "Same as ID Address" menyalin alamat KTP ke domisili
 * (AC-40.07). Persetujuan pemohon dicatat dengan waktu dan kanal `WEB` (AC-40.08, IN-12).
 */
@Injectable()
export class SavePersonalSectionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sections: DraftSections,
    private readonly personals: ApplicationPersonalsRepository,
    private readonly addresses: ApplicationAddressesRepository,
    private readonly rules: StrictSections,
    private readonly encryption: TenantEncryption,
  ) {}

  execute(ctx: RequestContext, id: string, input: PersonalSectionInput, strict: boolean): Promise<SectionSaveResponse> {
    const now = new Date();
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lock(tx, ctx, id);
      const error = strict ? await this.rules.personalError(tx, draft, input, businessDate(now)) : null;
      if (error) throw error;
      const minimum = personalMinimum(input);
      await this.personals.update(tx, draft.id, await this.personalChanges(tx, input, minimum), ctx.userId);
      const idAddress = addressColumns(input.addresses.id);
      const { residence } = input.addresses;
      await this.addresses.upsert(
        tx,
        { applicationId: draft.id, tenantId: ctx.tenantId },
        [
          { id: uuidv7(), addressType: "ID", sameAsId: false, ...idAddress },
          {
            id: uuidv7(),
            addressType: "RESIDENCE",
            sameAsId: residence.sameAsId,
            ...(residence.sameAsId ? idAddress : addressColumns(residence)),
          },
        ],
        ctx.userId,
      );
      const consentAt = input.consentGiven ? (draft.consentAt ?? now) : null;
      return this.sections.saved(tx, ctx, draft, "personal", strict, {
        consentAt,
        consentChannel: consentAt ? "WEB" : null,
      });
    });
  }

  private async personalChanges(
    tx: Tx,
    input: PersonalSectionInput,
    minimum: PersonalMinimum,
  ): Promise<PersonalChanges> {
    const encrypt = async (value: string | undefined) => {
      if (value === undefined || value === "") return { enc: null, keyVersion: null };
      const field = await this.encryption.encrypt(tx, value);
      return { enc: field.ciphertext, keyVersion: field.keyVersion };
    };
    const idCard = await this.encryption.encrypt(tx, minimum.idCardNumber);
    const motherMaidenName = await encrypt(input.motherMaidenName);
    const npwpNumber = await encrypt(input.npwpNumber);
    const kkNumber = await encrypt(input.kkNumber);
    return {
      fullName: minimum.fullName,
      fullNameId: minimum.fullNameId,
      placeOfBirth: input.placeOfBirth ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      religion: input.religion ?? null,
      nationality: input.nationality ?? null,
      education: input.education ?? null,
      marital: input.marital ?? null,
      motherMaidenNameEnc: motherMaidenName.enc,
      motherMaidenNameKeyVersion: motherMaidenName.keyVersion,
      idType: minimum.idType,
      idCardNumberEnc: idCard.ciphertext,
      idCardNumberKeyVersion: idCard.keyVersion,
      idCardNumberBidx: await this.encryption.blindIndex(tx, minimum.idCardNumber),
      idIssuedDate: input.idIssuedDate ?? null,
      idExpiredDate: input.idExpiredDate ?? null,
      npwpNumberEnc: npwpNumber.enc,
      npwpNumberKeyVersion: npwpNumber.keyVersion,
      kkNumberEnc: kkNumber.enc,
      kkNumberKeyVersion: kkNumber.keyVersion,
      mobileNumber: input.mobileNumber ?? null,
      phoneNumber: input.phoneNumber ?? null,
      email: input.email ?? null,
    };
  }
}
