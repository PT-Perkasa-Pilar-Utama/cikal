import { processFinishRequestSchema } from "@cikal/contracts";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { useFinishProcess } from "./api";

/** Batas `reason` di body Finish (api-specs 13 §13.5). */
const REASON_MAX_LENGTH = 500;

interface FinishPopupProps {
  processInstanceId: string;
  onClose: () => void;
  /** Dipanggil dengan `message` server, contoh "Process finished". */
  onFinished: (message: string | undefined) => void;
}

/**
 * Popup "Finish": isi "Reason" lalu "Yes" menghentikan proses (AC-86.02). Alasan kosong ditolak dengan pesan skema
 * kontrak sebelum request.
 */
export function FinishPopup({ processInstanceId, onClose, onFinished }: FinishPopupProps) {
  const finish = useFinishProcess(processInstanceId);
  const [reasonError, setReasonError] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = processFinishRequestSchema.safeParse({ reason: new FormData(event.currentTarget).get("reason") });
    if (!parsed.success) {
      setReasonError(z.flattenError(parsed.error).fieldErrors.reason?.[0]);
      return;
    }
    setReasonError(undefined);
    finish.mutate(parsed.data, { onSuccess: (result) => onFinished(result.message) });
  }

  return (
    <Popup title="Finish" size="sm" onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {finish.error && <FeedbackMessage type="error">{finish.error.message}</FeedbackMessage>}
        <TextAreaField
          label="Reason"
          name="reason"
          required
          maxLength={REASON_MAX_LENGTH}
          placeholder="Type here"
          error={reasonError}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            No
          </Button>
          <Button type="submit" disabled={finish.isPending}>
            Yes
          </Button>
        </div>
      </form>
    </Popup>
  );
}
