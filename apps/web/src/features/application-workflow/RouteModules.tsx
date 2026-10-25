import type { SkipReason, TimelineStep } from "@cikal/contracts";
import { isCurrentStep, stepName } from "./labels";

interface RouteModulesProps {
  routeVersion: number;
  steps: TimelineStep[];
}

/** Langkah di luar rute atau modul tak berlisensi tetap ada di timeline, tetapi bukan modul rute yang dipakai. */
const OUTSIDE_ROUTE: ReadonlySet<SkipReason | null> = new Set(["NOT_IN_ROUTE", "NOT_LICENSED"]);

/** Modul rute versi yang dikunci pengajuan, dengan langkah saat ini disorot (AC-85.01). */
export function RouteModules({ routeVersion, steps }: RouteModulesProps) {
  const routeSteps = steps.filter((step) => !OUTSIDE_ROUTE.has(step.skipReason));
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-neutral-7">Route Version {routeVersion}</p>
      <ol aria-label="Route modules" className="flex flex-wrap gap-2">
        {routeSteps.map((step) => (
          <li
            key={step.stepExecutionId}
            aria-current={isCurrentStep(step) ? "step" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isCurrentStep(step) ? "bg-primary text-neutral-0" : "bg-neutral-1 text-neutral-6"
            }`}
          >
            {stepName(step.stepCode)}
          </li>
        ))}
      </ol>
    </div>
  );
}
