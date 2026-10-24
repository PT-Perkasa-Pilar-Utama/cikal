import type { ParamType } from "@cikal/contracts";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { SelectField, type SelectOption } from "../../components/ui/SelectField";
import { useParameterOptions } from "./api";

/** Section form berjudul Primary dengan grid dua pasang label-input per baris (design-system 6.3, 8.4). */
export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 text-lg font-bold text-primary">{title}</legend>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

const LOADING_LABEL = "Loading...";

/**
 * Pilihan dropdown yang masih dimuat diganti satu opsi sementara berisi nilai tersimpan, agar "Next" atau "Submit"
 * sebelum pilihan tiba tetap mengirim nilai itu, bukan field kosong.
 */
export function loadingOptions(
  options: readonly SelectOption[],
  savedValue: string | undefined,
  loading: boolean,
): readonly SelectOption[] {
  return loading && savedValue ? [{ value: savedValue, label: LOADING_LABEL }] : options;
}

interface ParameterSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  paramType: ParamType;
  error?: string;
}

/**
 * Dropdown berisi pilihan General Parameter aktif; nilai yang dikirim adalah `paramId` (api-specs 06 §6.1). Dropdown
 * dipasang ulang saat pilihan tiba agar `defaultValue` dari data tersimpan ikut terpilih.
 */
export function ParameterSelect({ paramType, ...props }: ParameterSelectProps) {
  const { data = [], isPending } = useParameterOptions(paramType);
  const options = data.map((option) => ({ value: option.paramId, label: option.paramValue }));
  const saved = typeof props.defaultValue === "string" ? props.defaultValue : undefined;
  return <SelectField key={data.length} {...props} options={loadingOptions(options, saved, isPending)} />;
}
