import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, useId } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly SelectOption[];
}

const PLACEHOLDER = "Select";

/** Dropdown dengan label, tanda `*` merah untuk wajib, placeholder "Select", dan chevron di kanan (design-system 7.1). */
export function SelectField({ label, options, required, id, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="font-semibold text-neutral-7">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-error">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className="w-full appearance-none rounded bg-neutral-0 py-2.5 pr-9 pl-3 text-neutral-8 shadow-xs ring-1 ring-neutral-3 outline-none focus:ring-2 focus:ring-primary"
          {...props}
        >
          <option value="">{PLACEHOLDER}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-neutral-5"
        />
      </div>
    </div>
  );
}
