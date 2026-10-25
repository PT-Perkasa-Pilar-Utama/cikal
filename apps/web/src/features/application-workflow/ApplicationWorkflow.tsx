import { useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { ApiError } from "../../lib/api/client";
import { useProcessTimeline } from "./api";
import type { ResultStep } from "./labels";
import { RouteModules } from "./RouteModules";
import { StepResultPopup } from "./StepResultPopup";
import { TimelineTable } from "./TimelineTable";

/** Pengajuan Draft belum punya proses; pesannya petunjuk, bukan kegagalan (AC-85.05). */
const isProcessNotStarted = (error: Error): boolean =>
  error instanceof ApiError && error.envelope.code === "PROCESS_NOT_STARTED";

/**
 * Isi tab "Workflow" (api-specs 13 §13.2): dropdown "Process" untuk proses awal atau recontest (AC-85.03), modul
 * rute dengan langkah saat ini, dan timeline langkah. Klik langkah otomatis membuka hasilnya untuk proses yang dipilih.
 */
export function ApplicationWorkflow({ applicationId }: { applicationId: string }) {
  const [processId, setProcessId] = useState<string>();
  const [opened, setOpened] = useState<ResultStep | null>(null);
  const { data, error } = useProcessTimeline(applicationId, processId);

  if (error) {
    return <FeedbackMessage type={isProcessNotStarted(error) ? "info" : "error"}>{error.message}</FeedbackMessage>;
  }
  if (!data) return <p>Loading...</p>;
  const timeline = data.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-s">
        <p className="font-semibold text-neutral-8">Loan ID: {timeline.loanId}</p>
        <div className="max-w-xs">
          <SelectField
            label="Process"
            options={timeline.processes.map((process) => ({ value: process.id, label: process.label }))}
            value={timeline.selectedProcessId}
            onChange={(event) => {
              if (event.target.value) setProcessId(event.target.value);
            }}
          />
        </div>
        <RouteModules routeVersion={timeline.routeVersion} steps={timeline.steps} />
      </div>
      <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
        <TimelineTable steps={timeline.steps} onOpen={setOpened} />
      </div>
      {opened && (
        <StepResultPopup
          stepCode={opened}
          applicationId={applicationId}
          processInstanceId={timeline.selectedProcessId}
          onClose={() => setOpened(null)}
        />
      )}
    </div>
  );
}
