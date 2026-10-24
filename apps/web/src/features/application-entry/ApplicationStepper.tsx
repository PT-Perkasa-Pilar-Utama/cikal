import type { FormSection } from "@cikal/contracts";
import { BadgeX, CircleCheck } from "lucide-react";
import { STEP_LABELS } from "./labels";

interface ApplicationStepperProps {
  steps: readonly FormSection[];
  current: FormSection;
  completed: ReadonlySet<FormSection>;
  /** Step yang ditandai error oleh submit (`details[].section`, AC-50.03). */
  errored: ReadonlySet<FormSection>;
}

/**
 * Tab horizontal sebagai stepper dari `steps[]` (design-system 8.4, api-specs 12 §12.1): tab aktif bergaris bawah
 * Primary, step yang sudah disimpan dengan "Next" bertanda centang (AC-39.01), dan step yang gagal divalidasi saat
 * submit bertanda error (AC-50.03).
 */
export function ApplicationStepper({ steps, current, completed, errored }: ApplicationStepperProps) {
  return (
    <ol aria-label="Application steps" className="flex flex-wrap gap-1 border-b border-neutral-2">
      {steps.map((step) => {
        const active = step === current;
        const failed = errored.has(step);
        const done = completed.has(step) && !failed;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            data-completed={done || undefined}
            data-error={failed || undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 font-semibold ${
              active ? "border-primary" : "border-transparent"
            } ${failed ? "text-error" : active ? "text-primary" : "text-neutral-5"}`}
          >
            {done && <CircleCheck size={16} aria-label="Completed" className="text-success" />}
            {failed && <BadgeX size={16} aria-label="Error" />}
            {STEP_LABELS[step]}
          </li>
        );
      })}
    </ol>
  );
}
