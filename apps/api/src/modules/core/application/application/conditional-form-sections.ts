import type { ApplicationFormSections } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationBusinessesRepository } from "../db/application-businesses.repository.js";
import { ApplicationCollateralsRepository } from "../db/application-collaterals.repository.js";
import { ApplicationSpousesRepository } from "../db/application-spouses.repository.js";
import { addressOf } from "../domain/address-fields.js";

type ConditionalSections = Pick<ApplicationFormSections, "spouse" | "business" | "collateral">;

/**
 * Isi section Spouse, Business, dan Collateral yang tersimpan (api-specs 12 §12.5); `null` bila belum disimpan. NIK
 * pasangan dan nomor sertifikat didekripsi.
 */
@Injectable()
export class ConditionalFormSections {
  constructor(
    private readonly spouses: ApplicationSpousesRepository,
    private readonly businesses: ApplicationBusinessesRepository,
    private readonly collaterals: ApplicationCollateralsRepository,
    private readonly encryption: TenantEncryption,
  ) {}

  async load(tx: Tx, applicationId: string): Promise<ConditionalSections> {
    const decrypt = async (ciphertext: Buffer | null, keyVersion: number | null) =>
      ciphertext === null || keyVersion === null ? null : this.encryption.decrypt(tx, { ciphertext, keyVersion });
    const spouse = await this.spouses.findByApplication(tx, applicationId);
    const business = await this.businesses.findByApplication(tx, applicationId);
    const collateral = await this.collaterals.findByApplication(tx, applicationId);
    return {
      spouse: spouse && {
        fullName: spouse.fullName,
        idNumber: await decrypt(spouse.idNumberEnc, spouse.idNumberKeyVersion),
        dateOfBirth: spouse.dateOfBirth,
        mobileNumber: spouse.mobileNumber,
        prenuptialAgreement: spouse.prenuptialAgreement,
        idExpiredDate: spouse.idExpiredDate,
        idAddress: addressOf({ ...spouse, address: spouse.idAddress, rt: spouse.idRt, rw: spouse.idRw }),
        occupation: spouse.occupation,
        industryOfProfession: spouse.industryOfProfession,
        position: spouse.position,
        sourceOfFunds: spouse.sourceOfFunds,
        monthlyIncome: spouse.monthlyIncome,
        monthlySpending: spouse.monthlySpending,
        company: {
          name: spouse.companyName,
          address: spouse.companyAddress,
          provinceCode: spouse.companyProvinceCode,
          cityCode: spouse.companyCityCode,
          phoneNumber: spouse.companyPhoneNumber,
        },
      },
      business: business && {
        businessName: business.businessName,
        businessField: business.businessField,
        phoneNumber: business.phoneNumber,
        email: business.email,
        annualSales: business.annualSales,
        businessNumber: business.businessNumber,
        businessLaunchDate: business.businessLaunchDate,
        characteristicOfFinancing: business.characteristicOfFinancing,
        typeOfFinancing: business.typeOfFinancing,
        typeOfUsage: business.typeOfUsage,
        categoryOfFinancing: business.categoryOfFinancing,
        relationshipWithBank: business.relationshipWithBank,
        address: addressOf(business),
      },
      collateral: collateral && {
        collateralType: collateral.collateralType,
        vehicleType: collateral.vehicleType,
        vehicleBrand: collateral.vehicleBrand,
        vehicleModel: collateral.vehicleModel,
        description: collateral.description,
        vehicleYear: collateral.vehicleYear,
        vehiclePrice: collateral.vehiclePrice,
        vehicleColor: collateral.vehicleColor,
        machineNumber: collateral.machineNumber,
        frameNumber: collateral.frameNumber,
        bpkbNumber: collateral.bpkbNumber,
        bpkbOwnerOccupation: collateral.bpkbOwnerOccupation,
        policeNumber: collateral.policeNumber,
        certificateType: collateral.certificateType,
        certificateNumber: await decrypt(collateral.certificateNumberEnc, collateral.certificateNumberKeyVersion),
        surfaceArea: collateral.surfaceArea,
        decreeNumber: collateral.decreeNumber,
        decreeDate: collateral.decreeDate,
        address: addressOf(collateral),
      },
    };
  }
}
