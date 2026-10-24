import { Button } from "../../components/ui/Button";
import { Popup } from "../../components/ui/Popup";

interface ConfirmationPopupProps {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Tombol konfirmasi nonaktif selama permintaan berjalan, agar klik ganda tidak mengirim dua kali (AC-50.07). */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Popup konfirmasi form pengajuan: "Back" dengan "Unsaved data will be lost. Continue?" (AC-39.04) dan "Submit" dengan
 * "Submit this application?" (AC-50.01).
 */
export function ConfirmationPopup({
  title,
  text,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmationPopupProps) {
  return (
    <Popup title={title} size="sm" onClose={onCancel}>
      <p>{text}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Popup>
  );
}
