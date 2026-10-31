import type {
  Address,
  AddressInput,
  ApplicationFormResponse,
  ApplicationFormSections,
  FormSection,
} from "@cikal/contracts";
import { conditionalValues } from "./conditional-step-values";
import type { SectionValues } from "./use-entry-flow";

/** Nilai kosong dari API (`null`) menjadi field yang tidak dikirim. */
const value = <T>(input: T | null): T | undefined => input ?? undefined;

function addressInput(address: Address | null): AddressInput {
  return {
    address: address?.address ?? undefined,
    rt: address?.rt ?? undefined,
    rw: address?.rw ?? undefined,
    provinceCode: address?.provinceCode ?? undefined,
    cityCode: address?.cityCode ?? undefined,
    districtCode: address?.districtCode ?? undefined,
    subDistrictCode: address?.subDistrictCode ?? undefined,
    zipCode: address?.zipCode ?? undefined,
  };
}

function applicationValues({ application: a, personal: p }: ApplicationFormSections): SectionValues["application"] {
  return {
    application: {
      applicationType: value(a.applicationType),
      productCategory: a.productCategory,
      productId: a.productId,
      segment: value(a.segment),
      purposeOfLoan: value(a.purposeOfLoan),
      tenorProposed: value(a.tenorProposed),
      requestedLimit: value(a.requestedLimit),
      insuranceId: value(a.insuranceId),
      sourceCode: value(a.sourceCode),
      salesCode: value(a.salesCode),
      referralCode: value(a.referralCode),
      marketingCode: value(a.marketingCode),
    },
    identity: { idType: p.idType, idCardNumber: p.idCardNumber, fullName: p.fullName, fullNameId: p.fullNameId },
  };
}

function personalValues({ personal: p }: ApplicationFormSections): SectionValues["personal"] {
  const residence = p.addresses.residence;
  return {
    fullName: p.fullName,
    fullNameId: p.fullNameId,
    placeOfBirth: value(p.placeOfBirth),
    dateOfBirth: value(p.dateOfBirth),
    gender: value(p.gender),
    religion: value(p.religion),
    nationality: value(p.nationality),
    education: value(p.education),
    marital: value(p.marital),
    motherMaidenName: value(p.motherMaidenName),
    idType: p.idType,
    idCardNumber: p.idCardNumber,
    idIssuedDate: value(p.idIssuedDate),
    npwpNumber: value(p.npwpNumber),
    kkNumber: value(p.kkNumber),
    mobileNumber: value(p.mobileNumber),
    phoneNumber: value(p.phoneNumber),
    email: value(p.email),
    addresses: {
      id: addressInput(p.addresses.id),
      residence: { ...addressInput(residence), sameAsId: residence?.sameAsId ?? false },
    },
    consentGiven: p.consentAt !== null,
  };
}

function occupationValues({ occupation: o }: ApplicationFormSections): SectionValues["occupation"] {
  if (!o) return undefined;
  return {
    sourceOfIncome: value(o.sourceOfIncome),
    occupation: value(o.occupation),
    industryOfProfession: value(o.industryOfProfession),
    position: value(o.position),
    tenureAtCurrentJob: value(o.tenureAtCurrentJob),
    monthlyIncomeAllowance: value(o.monthlyIncomeAllowance),
    organization: value(o.organization),
    previousEmployer: value(o.previousEmployer),
    pensionInstance: value(o.pensionInstance),
    company: {
      name: value(o.company.name),
      phoneNumber: value(o.company.phoneNumber),
      address: value(o.company.address),
      provinceCode: value(o.company.provinceCode),
      cityCode: value(o.company.cityCode),
      districtCode: value(o.company.districtCode),
      subDistrictCode: value(o.company.subDistrictCode),
      zipCode: value(o.company.zipCode),
    },
  };
}

function emergencyContactValues(sections: ApplicationFormSections): SectionValues["emergency-contact"] {
  const contact = sections["emergency-contact"];
  if (!contact) return undefined;
  return {
    contactName: value(contact.contactName),
    relationToApplicant: value(contact.relationToApplicant),
    mobileNumber: value(contact.mobileNumber),
    homePhoneNumber: value(contact.homePhoneNumber),
    altPhoneNumber: value(contact.altPhoneNumber),
    address: addressInput(contact.address),
  };
}

/** Keadaan awal alur form untuk draft yang dilanjutkan dari "Application List" (api-specs 12 §12.5, AC-49.05). */
export interface DraftStart {
  draft: { id: string; loanId: string };
  steps: FormSection[];
  current: FormSection;
  values: SectionValues;
  /** Catatan pengembalian verifikator atau approver yang tampil di atas form (AC-64.02, AC-73.02). */
  returnNote: string | null;
}

export function draftStart({ data }: ApplicationFormResponse): DraftStart {
  return {
    draft: { id: data.id, loanId: data.loanId },
    steps: data.steps,
    current: data.currentSection,
    values: {
      application: applicationValues(data.sections),
      personal: personalValues(data.sections),
      occupation: occupationValues(data.sections),
      ...conditionalValues(data.sections),
      "emergency-contact": emergencyContactValues(data.sections),
    },
    returnNote: data.returnNote,
  };
}
