import { Button } from "../../components/ui/Button";
import { Popup } from "../../components/ui/Popup";
import { UNSAVED_DATA_CONFIRMATION } from "./labels";

interface BackConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/** Konfirmasi tombol "Back": "OK" membuang data yang belum disimpan tanpa memanggil API (AC-39.04, api-specs 12 §12.1). */
export function BackConfirmation({ onConfirm, onCancel }: BackConfirmationProps) {
  return (
    <Popup title="Back" size="sm" onClose={onCancel}>
      <p>{UNSAVED_DATA_CONFIRMATION}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>OK</Button>
      </div>
    </Popup>
  );
}
