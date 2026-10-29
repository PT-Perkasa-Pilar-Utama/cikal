import type { ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Popup } from "../../components/ui/Popup";

interface ConfirmPopupProps {
  question: string;
  /** Isian tambahan di dalam konfirmasi, contoh "Reason" untuk Not Valid (AC-76.04). */
  children?: ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Konfirmasi "Yes" sebelum perintah langkah pencairan dikirim (AC-76.01, AC-76.04, AC-101.01, AC-101.02). */
export function ConfirmPopup({ question, children, confirmDisabled, onConfirm, onCancel }: ConfirmPopupProps) {
  return (
    <Popup title="Confirmation" size="sm" onClose={onCancel}>
      <p className="text-neutral-8">{question}</p>
      {children}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          No
        </Button>
        <Button disabled={confirmDisabled} onClick={onConfirm}>
          Yes
        </Button>
      </div>
    </Popup>
  );
}
