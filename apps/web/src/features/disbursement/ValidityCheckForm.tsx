import type { DisbursementDetail, ValidityCheckRequest } from "@cikal/contracts";
import { CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import { useValidityCheck } from "./api";
import { ConfirmPopup } from "./ConfirmPopup";
import { businessToday, DATE_TOO_EARLY, formMessage, REQUIRED, serverFieldErrors } from "./disbursement-values";

/** AC-76.01 dan AC-76.04 tidak memberi teks konfirmasi; mengikuti pola konfirmasi AC-72.01. */
const CONFIRM_VALID = "Are you sure the disbursement data is valid?";
const CONFIRM_NOT_VALID = "Are you sure the disbursement data is not valid?";

interface ValidityCheckFormProps {
  detail: DisbursementDetail;
  /** Dipanggil dengan pesan server, contoh "Disbursement data validated" (AC-76.01). */
  onDone: (message: string) => void;
}

/**
 * "Validity Check Form": "Disbursement Date" minimal besok (AC-76.02), "First Installment Date" yang boleh diubah
 * (AC-76.05), lalu "Valid" atau "Not Valid" dengan "Reason" dan konfirmasi "Yes" (AC-76.01, AC-76.04).
 */
export function ValidityCheckForm({ detail, onDone }: ValidityCheckFormProps) {
  const [disbursementDate, setDisbursementDate] = useState(detail.disbursementDate ?? "");
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(detail.firstInstallmentDate);
  const [reason, setReason] = useState("");
  const [dateError, setDateError] = useState<string>();
  const [confirming, setConfirming] = useState<"VALID" | "NOT_VALID" | null>(null);
  const check = useValidityCheck(detail.applicationId);
  const serverErrors = serverFieldErrors(check.error);

  function valid() {
    check.reset();
    const error = !disbursementDate ? REQUIRED : disbursementDate <= businessToday() ? DATE_TOO_EARLY : undefined;
    setDateError(error);
    if (!error) setConfirming("VALID");
  }

  function submit(request: ValidityCheckRequest) {
    setConfirming(null);
    check.mutate(request, { onSuccess: (result) => onDone(result.message) });
  }

  const validRequest: ValidityCheckRequest = {
    result: "VALID",
    disbursementDate,
    ...(firstInstallmentDate !== detail.firstInstallmentDate ? { firstInstallmentDate } : {}),
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-s">
      {formMessage(check.error) && <FeedbackMessage type="error">{formMessage(check.error)}</FeedbackMessage>}
      {serverErrors.reason && <FeedbackMessage type="error">{serverErrors.reason}</FeedbackMessage>}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Disbursement Date"
          type="date"
          required
          value={disbursementDate}
          error={dateError ?? serverErrors.disbursementDate}
          onChange={(event) => setDisbursementDate(event.target.value)}
        />
        <TextField
          label="First Installment Date"
          type="date"
          value={firstInstallmentDate}
          error={serverErrors.firstInstallmentDate}
          onChange={(event) => setFirstInstallmentDate(event.target.value)}
        />
      </div>
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          disabled={check.isPending}
          onClick={() => {
            check.reset();
            setConfirming("NOT_VALID");
          }}
        >
          <CircleX size={16} aria-hidden />
          Not Valid
        </Button>
        <Button disabled={check.isPending} onClick={valid}>
          <CircleCheck size={16} aria-hidden />
          Valid
        </Button>
      </div>
      {confirming === "VALID" && (
        <ConfirmPopup
          question={CONFIRM_VALID}
          onConfirm={() => submit(validRequest)}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === "NOT_VALID" && (
        <ConfirmPopup
          question={CONFIRM_NOT_VALID}
          confirmDisabled={!reason.trim()}
          onConfirm={() => submit({ result: "NOT_VALID", reason: reason.trim() })}
          onCancel={() => setConfirming(null)}
        >
          <TextAreaField
            label="Reason"
            required
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </ConfirmPopup>
      )}
    </div>
  );
}
