import { X } from "lucide-react";
import { type ReactNode, useEffect, useId } from "react";

interface PopupProps {
  title: string;
  onClose: () => void;
  /** Lebar kartu; konfirmasi memakai `sm`, detail perbandingan memakai `lg`. */
  size?: "sm" | "lg";
  children: ReactNode;
}

const SIZE_CLASSES = { sm: "max-w-md", lg: "max-w-4xl" } as const;

/** Overlay modal untuk konfirmasi dan detail (design-system 7.1 Popup); tombol Escape menutupnya. */
export function Popup({ title, onClose, size = "lg", children }: PopupProps) {
  const titleId = useId();
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-9/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-full w-full flex-col rounded-lg bg-neutral-0 shadow-xl ${SIZE_CLASSES[size]}`}
      >
        <div className="flex items-center justify-between border-b border-neutral-2 px-6 py-4">
          <h2 id={titleId} className="text-lg font-bold text-primary">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-5 hover:bg-neutral-1 hover:text-neutral-8"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
