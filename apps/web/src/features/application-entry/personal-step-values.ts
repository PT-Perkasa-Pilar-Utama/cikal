import type { PersonalSectionInput } from "@cikal/contracts";
import { type AddressValues, addressInput } from "./address-values";
import { textInput } from "./form-input";

export interface PersonalAddresses {
  id: AddressValues;
  residence: AddressValues;
  /** `true` = API menyalin alamat KTP ke domisili dan mengabaikan field domisili (api-specs 12 §12.3, AC-40.07). */
  sameAsId: boolean;
}

/** Field `personal` dari form ditambah alamat dan persetujuan yang dikelola state (api-specs 12 §12.3). */
export function readPersonalStep(
  form: HTMLFormElement,
  addresses: PersonalAddresses,
  consentGiven: boolean,
): PersonalSectionInput {
  const data = new FormData(form);
  const text = (name: string) => textInput(data, name);
  return {
    fullName: text("fullName"),
    fullNameId: text("fullNameId"),
    placeOfBirth: text("placeOfBirth"),
    dateOfBirth: text("dateOfBirth"),
    gender: text("gender"),
    religion: text("religion"),
    nationality: text("nationality"),
    education: text("education"),
    marital: text("marital"),
    motherMaidenName: text("motherMaidenName"),
    idType: text("idType") === "KTP" ? "KTP" : undefined,
    idCardNumber: text("idCardNumber"),
    idIssuedDate: text("idIssuedDate"),
    npwpNumber: text("npwpNumber"),
    kkNumber: text("kkNumber"),
    mobileNumber: text("mobileNumber"),
    phoneNumber: text("phoneNumber"),
    email: text("email"),
    addresses: {
      id: addressInput(addresses.id),
      residence: addresses.sameAsId ? { sameAsId: true } : { ...addressInput(addresses.residence), sameAsId: false },
    },
    consentGiven,
  };
}
