import { type DisbursementRecordRequest, type DisbursementResult, disbursementResultSchema } from "@cikal/contracts";
import { Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import { useRecordDisbursement } from "./api";
import { ConfirmPopup } from "./ConfirmPopup";
import {
  type FieldErrors,
  formMessage,
  hasErrors,
  REASON_REQUIRED,
  requiredErrors,
  serverFieldErrors,
} from "./disbursement-values";

const RESULT_OPTIONS = [
  { value: "DISBURSED", label: "Disbursed" },
  { value: "FAILED", label: "Failed" },
] satisfies { value: DisbursementResult; label: string }[];

/** AC-101.01 dan AC-101.02 tidak memberi teks konfirmasi; mengikuti pola konfirmasi AC-72.01. */
const CONFIRM_RECORD = "Are you sure you want to record this disbursement result?";

type RecordField = "disbursementDate" | "coreLoanNumber" | "reason";

interface RecordDisbursementFormProps {
  applicationId: string;
  /** Dipanggil dengan pesan server, contoh "Disbursement recorded" (AC-101.01). */
  onDone: (message: string) => void;
}

/**
 * Form "Record Disbursement" mode MANUAL (api-specs 25 §25.4): "Disbursed" wajib "Disbursement Date" dan "Core Loan
 * Number" (AC-101.03), "Failed" wajib "Reason" (AC-101.05); "Submit" lalu "Yes" (AC-101.01, AC-101.02).
 */
export function RecordDisbursementForm({ applicationId, onDone }: RecordDisbursementFormProps) {
  const [result, setResult] = useState<DisbursementResult | undefined>();
  const [disbursementDate, setDisbursementDate] = useState("");
  const [coreLoanNumber, setCoreLoanNumber] = useState("");
  const [cif, setCif] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors<RecordField | "result">>({});
  const [confirming, setConfirming] = useState<DisbursementRecordRequest | null>(null);
  const record = useRecordDisbursement(applicationId);
  const serverErrors = serverFieldErrors(record.error);
  const fieldError = (field: RecordField) => errors[field] ?? serverErrors[field];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    record.reset();
    const missing: FieldErrors<RecordField | "result"> = !result
      ? requiredErrors({ result: "" })
      : result === "FAILED"
        ? reason.trim()
          ? {}
          : { reason: REASON_REQUIRED }
        : requiredErrors({ disbursementDate, coreLoanNumber });
    setErrors(missing);
    if (!result || hasErrors(missing)) return;
    setConfirming(
      result === "FAILED"
        ? { result, reason: reason.trim() }
        : {
            result,
            disbursementDate,
            coreLoanNumber: coreLoanNumber.trim(),
            ...(cif.trim() ? { cif: cif.trim() } : {}),
          },
    );
  }

  function confirm(request: DisbursementRecordRequest) {
    setConfirming(null);
    record.mutate(request, { onSuccess: (response) => onDone(response.message) });
  }

  return (
    <form
      aria-label="Record Disbursement"
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-s"
    >
      {formMessage(record.error) && <FeedbackMessage type="error">{formMessage(record.error)}</FeedbackMessage>}
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Result"
          required
          options={RESULT_OPTIONS}
          value={result ?? ""}
          error={errors.result}
          onChange={(event) => {
            setErrors({});
            setResult(disbursementResultSchema.safeParse(event.target.value).data);
          }}
        />
        {result === "DISBURSED" && (
          <>
            <TextField
              label="Disbursement Date"
              type="date"
              required
              value={disbursementDate}
              error={fieldError("disbursementDate")}
              onChange={(event) => setDisbursementDate(event.target.value)}
            />
            <TextField
              label="Core Loan Number"
              required
              maxLength={50}
              value={coreLoanNumber}
              error={fieldError("coreLoanNumber")}
              onChange={(event) => setCoreLoanNumber(event.target.value)}
            />
            <TextField label="CIF" maxLength={50} value={cif} onChange={(event) => setCif(event.target.value)} />
          </>
        )}
      </div>
      {result === "FAILED" && (
        <TextAreaField
          label="Reason"
          required
          maxLength={500}
          value={reason}
          error={fieldError("reason")}
          onChange={(event) => setReason(event.target.value)}
        />
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={record.isPending}>
          <Send size={16} aria-hidden />
          Submit
        </Button>
      </div>
      {confirming && (
        <ConfirmPopup
          question={CONFIRM_RECORD}
          onConfirm={() => confirm(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </form>
  );
}
