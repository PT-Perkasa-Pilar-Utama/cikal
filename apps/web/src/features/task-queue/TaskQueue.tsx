import type { QueueCode, TaskItem } from "@cikal/contracts";
import { useState } from "react";
import { BlankSlate } from "../../components/ui/BlankSlate";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Pagination } from "../../components/ui/Pagination";
import { Popup } from "../../components/ui/Popup";
import { formatDateTime } from "../../lib/format";
import { useTaskCommand, useTasks } from "./api";
import { TaskActions } from "./TaskActions";

/** AC-58.05 tidak memberi teks konfirmasi; mengikuti pola konfirmasi AC-12.01. */
const RELEASE_CONFIRMATION = "Are you sure you want to release this task?";

interface TaskQueueProps {
  queueCode: QueueCode;
  /** Membuka layar kerja tugas milik user sesi; isinya milik layar antrean pemakai komponen ini. */
  onProceed: (task: TaskItem) => void;
}

/**
 * Tabel antrean generik untuk semua antrean HumanTask (api-specs 14 §14.2 s.d. §14.4): kolom "Assigned To",
 * "Assign to Me" (AC-58.01), "Release Me" (AC-58.03), dan "Release" Supervisor dengan konfirmasi "Yes"
 * (AC-58.05). Pesan error server, contoh tugas sudah diambil orang lain (AC-58.04), tampil di atas tabel.
 */
export function TaskQueue({ queueCode, onProceed }: TaskQueueProps) {
  const [page, setPage] = useState(1);
  const [releasing, setReleasing] = useState<TaskItem | null>(null);
  const { data, isPending, error } = useTasks(queueCode, page);
  const assign = useTaskCommand("assign");
  const release = useTaskCommand("release");
  const busy = assign.isPending || release.isPending;
  const commandError = assign.error ?? release.error;

  function releaseTask(task: TaskItem) {
    setReleasing(null);
    assign.reset();
    release.mutate(task);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {commandError && <FeedbackMessage type="error">{commandError.message}</FeedbackMessage>}
      <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-2 text-left text-neutral-5">
              <th className="p-3">Loan ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Product</th>
              <th className="p-3">Branch</th>
              <th className="p-3">Assigned To</th>
              <th className="p-3">Created At</th>
              <th className="p-3">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((task) => (
              <tr key={task.id} className="border-b border-neutral-2 last:border-0">
                <td className="p-3 font-semibold text-neutral-8">{task.loanId}</td>
                <td className="p-3">{task.fullName ?? "-"}</td>
                <td className="p-3">{task.productCode}</td>
                <td className="p-3">{task.branchCode ?? "-"}</td>
                <td className="p-3">{task.assignedTo?.username ?? "-"}</td>
                <td className="p-3">{formatDateTime(task.createdAt)}</td>
                <td className="p-3">
                  <TaskActions
                    task={task}
                    busy={busy}
                    onAssign={() => {
                      release.reset();
                      assign.mutate(task);
                    }}
                    onProceed={() => onProceed(task)}
                    onRelease={() => releaseTask(task)}
                    onReleaseOther={() => setReleasing(task)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
      {releasing && (
        <Popup title="Confirmation" size="sm" onClose={() => setReleasing(null)}>
          <p className="text-neutral-8">{RELEASE_CONFIRMATION}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setReleasing(null)}>
              No
            </Button>
            <Button onClick={() => releaseTask(releasing)}>Yes</Button>
          </div>
        </Popup>
      )}
    </div>
  );
}
