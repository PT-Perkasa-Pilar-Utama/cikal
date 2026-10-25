import type { TimelineStep } from "@cikal/contracts";
import { formatDateTime } from "../../lib/format";
import {
  actorLabel,
  EMPTY_VALUE,
  isCurrentStep,
  isResultStep,
  type ResultStep,
  stepName,
  stepResultText,
  stepStatusLabel,
} from "./labels";

/** Langkah yang belum berjalan atau dilewati belum punya hasil untuk dibuka. */
const hasResult = (step: TimelineStep): boolean => step.status !== "PENDING" && step.status !== "SKIPPED";

const STATUS_CLASSES: Record<TimelineStep["status"], string> = {
  PENDING: "bg-neutral-1 text-neutral-5",
  RUNNING: "bg-primary-light text-primary",
  WAITING_HUMAN: "bg-warning-lightest text-neutral-9",
  WAITING_EXTERNAL: "bg-warning-lightest text-neutral-9",
  COMPLETED: "bg-success-lightest text-success",
  SKIPPED: "bg-neutral-1 text-neutral-5",
  ERROR: "bg-error-lightest text-error",
};

const formatTime = (value: string | null): string => (value ? formatDateTime(value) : EMPTY_VALUE);

interface TimelineTableProps {
  steps: TimelineStep[];
  onOpen: (stepCode: ResultStep) => void;
}

function StepCell({ step, onOpen }: { step: TimelineStep; onOpen: (stepCode: ResultStep) => void }) {
  const { stepCode } = step;
  if (!isResultStep(stepCode) || !hasResult(step)) {
    return <span className="font-semibold text-neutral-8">{stepName(stepCode)}</span>;
  }
  return (
    <button type="button" onClick={() => onOpen(stepCode)} className="font-semibold text-primary hover:underline">
      {stepName(stepCode)}
    </button>
  );
}

/**
 * Tabel timeline tab "Workflow": Start Date, End Date, Aging dalam hari kalender, pelaku, dan hasil per langkah
 * (AC-85.01, AC-85.04); langkah yang dilewati memakai label alasannya (AC-85.02). Nama langkah otomatis yang sudah
 * berjalan bisa diklik untuk membuka hasilnya.
 */
export function TimelineTable({ steps, onOpen }: TimelineTableProps) {
  return (
    <table className="w-full" aria-label="Timeline">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Step</th>
          <th className="p-3">Status</th>
          <th className="p-3">Start Date</th>
          <th className="p-3">End Date</th>
          <th className="p-3">Aging (days)</th>
          <th className="p-3">Actor</th>
          <th className="p-3">Result</th>
        </tr>
      </thead>
      <tbody>
        {steps.map((step) => (
          <tr
            key={step.stepExecutionId}
            aria-current={isCurrentStep(step) ? "step" : undefined}
            className={`border-b border-neutral-2 last:border-0 ${isCurrentStep(step) ? "bg-primary-light/30" : ""}`}
          >
            <td className="p-3">
              <StepCell step={step} onOpen={onOpen} />
            </td>
            <td className="p-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[step.status]}`}>
                {stepStatusLabel(step)}
              </span>
            </td>
            <td className="p-3">{formatTime(step.startedAt)}</td>
            <td className="p-3">{formatTime(step.endedAt)}</td>
            <td className="p-3">{step.aging ?? EMPTY_VALUE}</td>
            <td className="p-3">{actorLabel(step.actor)}</td>
            <td className="p-3">{stepResultText(step)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
