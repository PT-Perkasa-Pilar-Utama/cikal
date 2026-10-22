import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

/** Primary berisi warna Primary; Secondary bergaris tepi Primary (design-system 7.1). */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-neutral-0 hover:bg-primary/90",
  secondary: "border border-primary bg-neutral-0 text-primary hover:bg-primary-light/40",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Tombol Widget dengan ikon opsional sebagai anak (design-system 7.1). */
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
