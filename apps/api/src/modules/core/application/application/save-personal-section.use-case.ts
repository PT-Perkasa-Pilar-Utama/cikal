import type { PersonalSectionInput, SectionSaveResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { ProductAvailability } from "../../product/index.js";
import { ApplicationAddressesRepository } from "../db/application-addresses.repository.js";
import { ApplicationPersonalsRepository, type PersonalChanges } from "../db/application-personals.repository.js";
import type { DraftRow } from "../db/applications.repository.js";
import { addressColumns } from "../domain/address-fields.js";
import { type PersonalMinimum, personalMinimum } from "../domain/draft-minimum.js";
import { personalSectionError } from "../domain/personal-section-rules.js";
import { DraftSections } from "./draft-sections.js";

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
    private readonly products: ProductAvailability,
    private readonly encryption: TenantEncryption,
    @Inject(SYSTEM_PARAMETER_PORT) private readonly parameters: SystemParameterPort,
  ) {}

  execute(ctx: RequestContext, id: string, input: PersonalSectionInput, strict: boolean): Promise<SectionSaveResponse> {
    const now = new Date();
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lock(tx, ctx, id);
      if (strict) await this.checkStrict(tx, draft, input, businessDate(now));
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

  private async checkStrict(tx: Tx, draft: DraftRow, input: PersonalSectionInput, today: string): Promise<void> {
    const product = await this.products.eligibility(tx, draft.productId);
    // Foreign key pengajuan menjamin produk ada di tenant yang sama.
    if (!product) throw new Error(`Product ${draft.productId} not found`);
    const npwpMinLimit = await this.parameters.value(tx, "NPWP_MIN_LIMIT", draft.productId);
    // Definisi seed `base` punya default, jadi nilai kosong berarti konfigurasi instalasi rusak.
    if (npwpMinLimit === null) throw new Error("System parameter NPWP_MIN_LIMIT has no value");
    const error = personalSectionError(input, {
      today,
      requestedLimit: draft.requestedLimit,
      tenorProposed: draft.tenorProposed,
      npwpMinLimit,
      consentRequired: await this.parameters.flag(tx, "REQUIRE_CONSENT_FOR_EXTERNAL_CHECK"),
      product,
    });
    if (error) throw error;
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
