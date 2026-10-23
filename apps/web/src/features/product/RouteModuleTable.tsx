import { type StepCode, stepNames } from "@cikal/contracts";
import { BadgeInfo } from "lucide-react";
import { Switch } from "../../components/ui/Switch";
import { mandatoryStepMessage, type RouteStep, STEP_STATE_LABELS, type StepState, stepState } from "./route-labels";

/** Tag status modul (design-system 7.5 Tag); bersyarat bergaris putus-putus dan mati abu-abu seperti AC-32.01. */
const STATE_TAG_CLASSES: Record<StepState, string> = {
  ACTIVE: "bg-success-lightest text-success ring-1 ring-success-light",
  CONDITIONAL: "border border-dashed border-warning bg-warning-lightest text-neutral-9",
  OFF: "bg-neutral-1 text-neutral-5 ring-1 ring-neutral-2",
};

const tagClass = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold";

interface RouteModuleTableProps {
  steps: readonly RouteStep[];
  /** Nyala-mati per langkah; di mode lihat sama dengan `isEnabled` versi. */
  enabled: Readonly<Record<string, boolean>>;
  editing: boolean;
  onToggle: (step: RouteStep) => void;
  /** Langkah wajib yang terakhir diklik, keterangannya tampil di barisnya (AC-31.02). */
  mandatoryHint: StepCode | null;
}

function MandatoryTag() {
  return <span className={`${tagClass} bg-primary-light text-primary`}>Mandatory</span>;
}

/** Daftar modul rute berurutan dengan status; di mode edit nama modul menjadi toggle (FE-S2-01, api-specs 08 §8.10). */
export function RouteModuleTable({ steps, enabled, editing, onToggle, mandatoryHint }: RouteModuleTableProps) {
  return (
    <table aria-label="Route modules" className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="w-16 p-3">No</th>
          <th className="p-3">Module</th>
          <th className="w-40 p-3">Module Code</th>
          <th className="w-40 p-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {steps.map((step, index) => {
          const isEnabled = enabled[step.stepCode] ?? step.isEnabled;
          const state = stepState(step, isEnabled);
          const name = stepNames[step.stepCode];
          return (
            <tr key={step.stepCode} className="border-b border-neutral-2 last:border-0">
              <td className="p-3 text-neutral-5">{index + 1}</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {editing ? (
                    <Switch label={name} checked={isEnabled} onChange={() => onToggle(step)} />
                  ) : (
                    <span
                      className={`font-semibold ${state === "OFF" ? "text-neutral-4 line-through" : "text-neutral-8"}`}
                    >
                      {name}
                    </span>
                  )}
                  {step.isMandatory && <MandatoryTag />}
                </div>
                {editing && mandatoryHint === step.stepCode && (
                  <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs text-info">
                    <BadgeInfo size={16} aria-hidden />
                    {mandatoryStepMessage(step.stepCode)}
                  </p>
                )}
              </td>
              <td className="p-3 text-neutral-6">{step.moduleCode}</td>
              <td className="p-3">
                <span className={`${tagClass} ${STATE_TAG_CLASSES[state]}`}>{STEP_STATE_LABELS[state]}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
