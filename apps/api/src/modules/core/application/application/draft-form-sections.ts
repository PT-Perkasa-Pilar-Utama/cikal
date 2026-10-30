import type { ApplicationFormSections } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationAddressesRepository, type ApplicationAddressRow } from "../db/application-addresses.repository.js";
import { ApplicationEmergencyContactsRepository } from "../db/application-emergency-contacts.repository.js";
import { ApplicationOccupationsRepository } from "../db/application-occupations.repository.js";
import { type ApplicationPersonalRow, ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import type { DraftRow } from "../db/applications.repository.js";
import { addressOf } from "../domain/address-fields.js";
import { ConditionalFormSections } from "./conditional-form-sections.js";

/** Isi section form draft (api-specs 12 §12.5); field terenkripsi dibuka hanya untuk pembuat draft (AC-49.06). */
@Injectable()
export class DraftFormSections {
  constructor(
    private readonly personals: ApplicationPersonalsRepository,
    private readonly addresses: ApplicationAddressesRepository,
    private readonly occupations: ApplicationOccupationsRepository,
    private readonly contacts: ApplicationEmergencyContactsRepository,
    private readonly conditional: ConditionalFormSections,
    private readonly encryption: TenantEncryption,
  ) {}

  /** `null` bila data Personal draft tidak ada. */
  async load(tx: Tx, draft: DraftRow): Promise<ApplicationFormSections | null> {
    const personal = await this.personals.findByApplication(tx, draft.id);
    if (!personal) return null;
    const occupation = await this.occupations.findByApplication(tx, draft.id);
    const contact = await this.contacts.findByApplication(tx, draft.id);
    const { spouse, business, collateral } = await this.conditional.load(tx, draft.id);
    return {
      application: {
        applicationType: draft.applicationType,
        productCategory: draft.productCategory,
        productId: draft.productId,
        segment: draft.segment,
        purposeOfLoan: draft.purposeOfLoan,
        tenorProposed: draft.tenorProposed,
        requestedLimit: draft.requestedLimit,
        insuranceId: draft.insuranceId,
        sourceCode: draft.sourceCode,
        salesCode: draft.salesCode,
        referralCode: draft.referralCode,
        marketingCode: draft.marketingCode,
      },
      personal: await this.personal(tx, draft, personal),
      spouse,
      occupation: occupation && {
        sourceOfIncome: occupation.sourceOfIncome,
        occupation: occupation.occupation,
        industryOfProfession: occupation.industryOfProfession,
        position: occupation.position,
        tenureAtCurrentJob: occupation.tenureAtCurrentJob,
        monthlyIncomeAllowance: occupation.monthlyIncomeAllowance,
        organization: occupation.organization,
        previousEmployer: occupation.previousEmployer,
        pensionInstance: occupation.pensionInstance,
        company: {
          name: occupation.companyName,
          address: occupation.companyAddress,
          provinceCode: occupation.provinceCode,
          cityCode: occupation.cityCode,
          districtCode: occupation.districtCode,
          subDistrictCode: occupation.subDistrictCode,
          zipCode: occupation.zipCode,
          phoneNumber: occupation.companyPhoneNumber,
        },
      },
      business,
      collateral,
      "emergency-contact": contact && {
        contactName: contact.contactName,
        relationToApplicant: contact.relationToApplicant,
        mobileNumber: contact.mobileNumber,
        homePhoneNumber: contact.homePhoneNumber,
        altPhoneNumber: contact.altPhoneNumber,
        address: addressOf(contact),
      },
    };
  }

  private async personal(
    tx: Tx,
    draft: DraftRow,
    row: ApplicationPersonalRow,
  ): Promise<ApplicationFormSections["personal"]> {
    const decrypt = async (ciphertext: Buffer | null, keyVersion: number | null) =>
      ciphertext === null || keyVersion === null ? null : this.encryption.decrypt(tx, { ciphertext, keyVersion });
    const addresses = await this.addresses.listByApplication(tx, draft.id);
    const ofType = (type: ApplicationAddressRow["addressType"]) => addresses.find((item) => item.addressType === type);
    const idAddress = ofType("ID");
    const residence = ofType("RESIDENCE");
    return {
      idType: row.idType,
      idCardNumber: await this.encryption.decrypt(tx, {
        ciphertext: row.idCardNumberEnc,
        keyVersion: row.idCardNumberKeyVersion,
      }),
      fullName: row.fullName,
      fullNameId: row.fullNameId,
      placeOfBirth: row.placeOfBirth,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      religion: row.religion,
      nationality: row.nationality,
      education: row.education,
      marital: row.marital,
      motherMaidenName: await decrypt(row.motherMaidenNameEnc, row.motherMaidenNameKeyVersion),
      idIssuedDate: row.idIssuedDate,
      idExpiredDate: row.idExpiredDate,
      npwpNumber: await decrypt(row.npwpNumberEnc, row.npwpNumberKeyVersion),
      kkNumber: await decrypt(row.kkNumberEnc, row.kkNumberKeyVersion),
      mobileNumber: row.mobileNumber,
      phoneNumber: row.phoneNumber,
      email: row.email,
      addresses: {
        id: idAddress ? addressOf(idAddress) : null,
        residence: residence ? { ...addressOf(residence), sameAsId: residence.sameAsId } : null,
      },
      consentAt: draft.consentAt?.toISOString() ?? null,
    };
  }
}
