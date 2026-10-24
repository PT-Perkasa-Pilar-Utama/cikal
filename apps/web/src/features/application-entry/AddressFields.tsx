import type { RegionOption } from "@cikal/contracts";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import type { AddressValues } from "./address-values";
import { useRegionOptions, useSubDistrictOptions } from "./api";

interface AddressFieldsProps {
  value: AddressValues;
  onChange: (value: AddressValues) => void;
  /** Awalan nama field pada `details[].field` API, misalnya `addresses.id`. */
  errorPrefix: string;
  errors: Record<string, string>;
  /** Alamat salinan "Same as ID Address" tidak bisa diedit (AC-40.07). */
  readOnly?: boolean;
  /** Label field alamat jalan, misalnya "Company Address" di step Occupation. */
  addressLabel?: string;
  /** Alamat perusahaan tidak punya RT dan RW (api-specs 12 §12.3 `occupation`). */
  withRtRw?: boolean;
}

const PLACEHOLDER = "Type here";
const toOptions = (regions: readonly RegionOption[]) =>
  regions.map((region) => ({ value: region.code, label: region.name }));

/**
 * Alamat dengan Province, City, District, dan Sub District berjenjang (AC-23.04, AC-40.01): setiap dropdown hanya
 * memuat wilayah di bawah pilihan induknya, dan memilih induk baru mengosongkan tingkat di bawahnya. Kode pos
 * diisi dari Sub District (api-specs 06 §6.3.1).
 */
export function AddressFields({
  value,
  onChange,
  errorPrefix,
  errors,
  readOnly = false,
  addressLabel = "Address",
  withRtRw = true,
}: AddressFieldsProps) {
  const provinces = useRegionOptions("provinces").data ?? [];
  const cities = useRegionOptions("cities", value.provinceCode).data ?? [];
  const districts = useRegionOptions("districts", value.cityCode).data ?? [];
  const subDistricts = useSubDistrictOptions(value.districtCode).data ?? [];
  const error = (field: keyof AddressValues) => errors[`${errorPrefix}.${field}`];
  const set = (patch: Partial<AddressValues>) => onChange({ ...value, ...patch });

  return (
    <>
      <TextField
        label={addressLabel}
        required
        placeholder={PLACEHOLDER}
        readOnly={readOnly}
        value={value.address}
        onChange={(event) => set({ address: event.target.value })}
        error={error("address")}
      />
      {withRtRw && (
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="RT"
            inputMode="numeric"
            placeholder={PLACEHOLDER}
            readOnly={readOnly}
            value={value.rt}
            onChange={(event) => set({ rt: event.target.value })}
            error={error("rt")}
          />
          <TextField
            label="RW"
            inputMode="numeric"
            placeholder={PLACEHOLDER}
            readOnly={readOnly}
            value={value.rw}
            onChange={(event) => set({ rw: event.target.value })}
            error={error("rw")}
          />
        </div>
      )}
      <SelectField
        label="Province"
        options={toOptions(provinces)}
        disabled={readOnly}
        value={value.provinceCode}
        onChange={(event) =>
          set({ provinceCode: event.target.value, cityCode: "", districtCode: "", subDistrictCode: "", zipCode: "" })
        }
        error={error("provinceCode")}
      />
      <SelectField
        label="City"
        options={toOptions(cities)}
        disabled={readOnly}
        value={value.cityCode}
        onChange={(event) => set({ cityCode: event.target.value, districtCode: "", subDistrictCode: "", zipCode: "" })}
        error={error("cityCode")}
      />
      <SelectField
        label="District"
        options={toOptions(districts)}
        disabled={readOnly}
        value={value.districtCode}
        onChange={(event) => set({ districtCode: event.target.value, subDistrictCode: "", zipCode: "" })}
        error={error("districtCode")}
      />
      <SelectField
        label="Sub District"
        options={toOptions(subDistricts)}
        disabled={readOnly}
        value={value.subDistrictCode}
        onChange={(event) => {
          const subDistrict = subDistricts.find((option) => option.code === event.target.value);
          set({ subDistrictCode: event.target.value, zipCode: subDistrict?.zipCode ?? "" });
        }}
        error={error("subDistrictCode")}
      />
      <TextField label="Zip Code" readOnly value={value.zipCode} error={error("zipCode")} />
    </>
  );
}
