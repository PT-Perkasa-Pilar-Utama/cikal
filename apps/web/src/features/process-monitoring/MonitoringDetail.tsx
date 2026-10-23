import { type ProcessMonitoringItem, stepNames } from "@cikal/contracts";
import { CircleStop, RotateCcw } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { formatDateTime } from "../../lib/format";
import { useRetryStep } from "./api";
import { FinishPopup } from "./FinishPopup";
import { orDash } from "./labels";
import { StatusTag } from "./StatusTag";

interface MonitoringDetailProps {
  item: ProcessMonitoringItem;
  canUpdate: boolean;
  onClose: () => void;
  /** Dipanggil dengan `message` server setelah Retry atau Finish berhasil. */
  onDone: (message: string | undefined) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-neutral-5">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/**
 * Popup "Process Monitoring Detail": langkah saat ini dengan pesan error-nya, tombol "Retry" untuk langkah Error
 * (AC-86.01, AC-86.03), dan "Finish" dengan alasan (AC-86.02). Retry yang gagal lagi menampilkan pesan server di
 * popup; attempt baru ikut `item` dari daftar yang dimuat ulang.
 */
export function MonitoringDetail({ item, canUpdate, onClose, onDone }: MonitoringDetailProps) {
  const retry = useRetryStep(item.processInstanceId);
  const [finishing, setFinishing] = useState(false);
  const step = item.currentStep;

  return (
    <Popup title="Process Monitoring Detail" onClose={onClose}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
        <Field label="Loan ID">{item.loanId}</Field>
        <Field label="Name">{orDash(item.fullName)}</Field>
        <Field label="Branch">{orDash(item.branchCode)}</Field>
        <Field label="Step">{stepNames[step.stepCode]}</Field>
        <Field label="Status">
          <StatusTag status={step.status} />
        </Field>
        <Field label="Attempt">{step.attempt}</Field>
        <Field label="Started At">{step.startedAt ? formatDateTime(step.startedAt) : "-"}</Field>
      </dl>
      {step.errorMessage && (
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold text-neutral-7">Error Message</p>
          <p className="rounded-lg bg-error-lightest px-3 py-2.5 text-neutral-9">{step.errorMessage}</p>
        </div>
      )}
      {retry.error && <FeedbackMessage type="error">{retry.error.message}</FeedbackMessage>}
      {canUpdate && (
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={retry.isPending} onClick={() => setFinishing(true)}>
            <CircleStop size={20} aria-hidden />
            Finish
          </Button>
          {step.status === "ERROR" && (
            <Button
              disabled={retry.isPending}
              onClick={() => retry.mutate(step.stepExecutionId, { onSuccess: (result) => onDone(result.message) })}
            >
              <RotateCcw size={20} aria-hidden />
              Retry
            </Button>
          )}
        </div>
      )}
      {finishing && (
        <FinishPopup
          processInstanceId={item.processInstanceId}
          onClose={() => setFinishing(false)}
          onFinished={onDone}
        />
      )}
    </Popup>
  );
}
