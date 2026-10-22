interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Toggle dengan label (design-system 7.1 Switch); dibaca pembaca layar sebagai `switch` bernama label. */
export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 font-semibold text-neutral-7">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
          checked ? "bg-primary" : "bg-neutral-3"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-neutral-0 shadow-s transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
      {label}
    </label>
  );
}
