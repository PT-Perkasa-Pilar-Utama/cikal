import type {
  Address,
  AddressInput,
  ApplicationFormSections,
  BusinessSectionInput,
  CollateralSectionInput,
  SpouseSectionInput,
} from "@cikal/contracts";
import { collateralTypeSchema } from "@cikal/contracts";
import { type AddressValues, addressInput } from "./address-values";
import { integerInput, moneyInput, textInput } from "./form-input";

/** Field `spouse` dari form ditambah alamat KTP pasangan yang dikelola state (api-specs 12 §12.3). */
export function readSpouseStep(form: HTMLFormElement, idAddress: AddressValues): SpouseSectionInput {
  const data = new FormData(form);
  const text = (name: string) => textInput(data, name);
  return {
    fullName: text("fullName"),
    idNumber: text("idNumber"),
    dateOfBirth: text("dateOfBirth"),
    mobileNumber: text("mobileNumber"),
    prenuptialAgreement: text("prenuptialAgreement"),
    idAddress: addressInput(idAddress),
    occupation: text("occupation"),
    industryOfProfession: text("industryOfProfession"),
    position: text("position"),
    sourceOfFunds: text("sourceOfFunds"),
    monthlyIncome: moneyInput(data, "monthlyIncome"),
    monthlySpending: moneyInput(data, "monthlySpending"),
    company: {
      name: text("companyName"),
      address: text("companyAddress"),
      phoneNumber: text("companyPhoneNumber"),
    },
  };
}

/** Field `business` dari form ditambah alamat usaha yang dikelola state (api-specs 12 §12.3). */
export function readBusinessStep(form: HTMLFormElement, address: AddressValues): BusinessSectionInput {
  const data = new FormData(form);
  const text = (name: string) => textInput(data, name);
  return {
    businessName: text("businessName"),
    businessField: text("businessField"),
    phoneNumber: text("phoneNumber"),
    email: text("email"),
    annualSales: moneyInput(data, "annualSales"),
    businessNumber: text("businessNumber"),
    businessLaunchDate: text("businessLaunchDate"),
    address: addressInput(address),
  };
}

/** Field `collateral` dari form ditambah alamat agunan yang dikelola state (api-specs 12 §12.3). */
export function readCollateralStep(form: HTMLFormElement, address: AddressValues): CollateralSectionInput {
  const data = new FormData(form);
  const text = (name: string) => textInput(data, name);
  return {
    collateralType: collateralTypeSchema.safeParse(text("collateralType")).data,
    vehicleType: text("vehicleType"),
    vehicleBrand: text("vehicleBrand"),
    vehicleModel: text("vehicleModel"),
    vehicleYear: integerInput(data, "vehicleYear"),
    vehiclePrice: moneyInput(data, "vehiclePrice"),
    vehicleColor: text("vehicleColor"),
    machineNumber: text("machineNumber"),
    frameNumber: text("frameNumber"),
    bpkbNumber: text("bpkbNumber"),
    policeNumber: text("policeNumber"),
    certificateType: text("certificateType"),
    certificateNumber: text("certificateNumber"),
    surfaceArea: text("surfaceArea"),
    decreeNumber: text("decreeNumber"),
    decreeDate: text("decreeDate"),
    address: addressInput(address),
  };
}

/** Nilai kosong dari API (`null`) menjadi field yang tidak dikirim. */
const value = <T>(input: T | null): T | undefined => input ?? undefined;

function storedAddress(address: Address): AddressInput {
  return {
    address: value(address.address),
    rt: value(address.rt),
    rw: value(address.rw),
    provinceCode: value(address.provinceCode),
    cityCode: value(address.cityCode),
    districtCode: value(address.districtCode),
    subDistrictCode: value(address.subDistrictCode),
    zipCode: value(address.zipCode),
  };
}

/** Isi tersimpan section Spouse, Business, dan Collateral untuk draft yang dilanjutkan (api-specs 12 §12.5). */
export function conditionalValues({ spouse, business, collateral }: ApplicationFormSections): {
  spouse?: SpouseSectionInput;
  business?: BusinessSectionInput;
  collateral?: CollateralSectionInput;
} {
  return {
    spouse: spouse
      ? {
          fullName: value(spouse.fullName),
          idNumber: value(spouse.idNumber),
          dateOfBirth: value(spouse.dateOfBirth),
          mobileNumber: value(spouse.mobileNumber),
          prenuptialAgreement: value(spouse.prenuptialAgreement),
          idAddress: storedAddress(spouse.idAddress),
          occupation: value(spouse.occupation),
          industryOfProfession: value(spouse.industryOfProfession),
          position: value(spouse.position),
          sourceOfFunds: value(spouse.sourceOfFunds),
          monthlyIncome: value(spouse.monthlyIncome),
          monthlySpending: value(spouse.monthlySpending),
          company: {
            name: value(spouse.company.name),
            address: value(spouse.company.address),
            phoneNumber: value(spouse.company.phoneNumber),
          },
        }
      : undefined,
    business: business
      ? {
          businessName: value(business.businessName),
          businessField: value(business.businessField),
          phoneNumber: value(business.phoneNumber),
          email: value(business.email),
          annualSales: value(business.annualSales),
          businessNumber: value(business.businessNumber),
          businessLaunchDate: value(business.businessLaunchDate),
          address: storedAddress(business.address),
        }
      : undefined,
    collateral: collateral
      ? {
          collateralType: value(collateral.collateralType),
          vehicleType: value(collateral.vehicleType),
          vehicleBrand: value(collateral.vehicleBrand),
          vehicleModel: value(collateral.vehicleModel),
          vehicleYear: value(collateral.vehicleYear),
          vehiclePrice: value(collateral.vehiclePrice),
          vehicleColor: value(collateral.vehicleColor),
          machineNumber: value(collateral.machineNumber),
          frameNumber: value(collateral.frameNumber),
          bpkbNumber: value(collateral.bpkbNumber),
          policeNumber: value(collateral.policeNumber),
          certificateType: value(collateral.certificateType),
          certificateNumber: value(collateral.certificateNumber),
          surfaceArea: value(collateral.surfaceArea),
          decreeNumber: value(collateral.decreeNumber),
          decreeDate: value(collateral.decreeDate),
          address: storedAddress(collateral.address),
        }
      : undefined,
  };
}
