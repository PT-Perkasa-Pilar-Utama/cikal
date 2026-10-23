import { type TextareaHTMLAttributes, useId } from "react";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

/** Text area dengan label, tanda `*` merah untuk wajib, dan pesan error di bawah field (design-system 7.1). */
export function TextAreaField({ label, error, required, id, rows = 3, ...props }: TextAreaFieldProps) {
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
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`rounded bg-neutral-0 px-3 py-2.5 text-neutral-8 shadow-xs ring-1 outline-none placeholder:text-neutral-4 focus:ring-2 ${
          error ? "ring-error focus:ring-error" : "ring-neutral-3 focus:ring-primary"
        }`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
