import type { ParamType } from "@cikal/contracts";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { SelectField } from "../../components/ui/SelectField";
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
  const { data = [] } = useParameterOptions(paramType);
  return (
    <SelectField
      key={data.length}
      {...props}
      options={data.map((option) => ({ value: option.paramId, label: option.paramValue }))}
    />
  );
}
