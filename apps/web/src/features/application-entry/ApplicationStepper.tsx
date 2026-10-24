import type { FormSection } from "@cikal/contracts";
import { CircleCheck } from "lucide-react";
import { STEP_LABELS } from "./labels";

interface ApplicationStepperProps {
  steps: readonly FormSection[];
  current: FormSection;
  completed: ReadonlySet<FormSection>;
}

/**
 * Tab horizontal sebagai stepper dari `steps[]` (design-system 8.4, api-specs 12 §12.1): tab aktif bergaris bawah
 * Primary, step yang sudah disimpan dengan "Next" bertanda centang (AC-39.01).
 */
export function ApplicationStepper({ steps, current, completed }: ApplicationStepperProps) {
  return (
    <ol aria-label="Application steps" className="flex flex-wrap gap-1 border-b border-neutral-2">
      {steps.map((step) => {
        const active = step === current;
        const done = completed.has(step);
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            data-completed={done || undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 font-semibold ${
              active ? "border-primary text-primary" : "border-transparent text-neutral-5"
            }`}
          >
            {done && <CircleCheck size={16} aria-label="Completed" className="text-success" />}
            {STEP_LABELS[step]}
          </li>
        );
      })}
    </ol>
  );
}
