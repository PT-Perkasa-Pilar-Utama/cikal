import type { LucideIcon } from "lucide-react";
import { type InputHTMLAttributes, type ReactNode, useId } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: LucideIcon;
  /** Kontrol di ujung kanan input, misalnya tombol lihat password. */
  trailing?: ReactNode;
}

/** Input dengan label, tanda `*` merah untuk wajib, ikon opsional, dan pesan error di bawah field (design-system 7.1). */
export function TextField({ label, error, icon: Icon, trailing, required, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-semibold text-neutral-7">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-error">
            *
          </span>
        )}
      </label>
      <div
        className={`flex items-center gap-2 rounded px-3 shadow-xs ring-1 focus-within:ring-2 ${
          props.readOnly || props.disabled ? "bg-neutral-1" : "bg-neutral-0"
        } ${error ? "ring-error focus-within:ring-error" : "ring-neutral-3 focus-within:ring-primary"}`}
      >
        {Icon && <Icon size={16} className="shrink-0 text-neutral-4" aria-hidden />}
        <input
          id={inputId}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-neutral-8 outline-none placeholder:text-neutral-4"
          {...props}
        />
        {trailing}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
