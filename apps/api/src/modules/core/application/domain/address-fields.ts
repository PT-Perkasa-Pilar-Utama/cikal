import type { AddressInput } from "@cikal/contracts";

/** Kolom alamat tabel section; field kosong disimpan `null` agar simpan ulang menghapus nilai lama. */
export interface AddressColumns {
  address: string | null;
  rt: string | null;
  rw: string | null;
  provinceCode: string | null;
  cityCode: string | null;
  districtCode: string | null;
  subDistrictCode: string | null;
  zipCode: string | null;
}

export function addressColumns(input: AddressInput): AddressColumns {
  return {
    address: input.address ?? null,
    rt: input.rt ?? null,
    rw: input.rw ?? null,
    provinceCode: input.provinceCode ?? null,
    cityCode: input.cityCode ?? null,
    districtCode: input.districtCode ?? null,
    subDistrictCode: input.subDistrictCode ?? null,
    zipCode: input.zipCode ?? null,
  };
}
