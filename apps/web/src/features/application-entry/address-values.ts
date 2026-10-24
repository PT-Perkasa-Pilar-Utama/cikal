import type { AddressInput } from "@cikal/contracts";

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

/** Isi field alamat menjadi body request; field kosong tidak dikirim. */
export function addressInput(values: AddressValues): AddressInput {
  const input: AddressInput = {};
  for (const key of ADDRESS_FIELDS) {
    const value = values[key].trim();
    if (value) input[key] = value;
  }
  return input;
}
