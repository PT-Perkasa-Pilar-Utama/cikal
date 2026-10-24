import type { AddressInput, PersonalSectionInput } from "@cikal/contracts";
import { textInput } from "./form-input";

const ADDRESS_FIELDS = [
  "address",
  "rt",
  "rw",
  "provinceCode",
  "cityCode",
  "districtCode",
  "subDistrictCode",
  "zipCode",
] as const satisfies readonly (keyof AddressInput)[];

/** Isi field alamat di layar; string kosong berarti belum diisi. */
export type AddressValues = Record<(typeof ADDRESS_FIELDS)[number], string>;

export const emptyAddress: AddressValues = {
  address: "",
  rt: "",
  rw: "",
  provinceCode: "",
  cityCode: "",
  districtCode: "",
  subDistrictCode: "",
  zipCode: "",
};

/** Alamat tersimpan menjadi isi field; field yang belum ada menjadi kosong. */
export function addressValues(input: AddressInput | undefined): AddressValues {
  const values = { ...emptyAddress };
  for (const key of ADDRESS_FIELDS) values[key] = input?.[key] ?? "";
  return values;
}

function addressInput(values: AddressValues): AddressInput {
  const input: AddressInput = {};
  for (const key of ADDRESS_FIELDS) {
    const value = values[key].trim();
    if (value) input[key] = value;
  }
  return input;
}

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
