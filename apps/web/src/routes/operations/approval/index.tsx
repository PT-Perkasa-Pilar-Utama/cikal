import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MenuGuard } from "../../../features/session/MenuGuard";
import { TaskQueue } from "../../../features/task-queue/TaskQueue";

/**
 * Halaman "Approval": antrean tugas `APPROVAL` yang ditugaskan per approver (api-specs 14 §14.2). Tombol "Detail"
 * membuka "Approval Detail" (AC-72.01).
 */
function ApprovalQueuePage() {
  const navigate = useNavigate();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Approval</h1>
      <TaskQueue
        queueCode="APPROVAL"
        proceedLabel="Detail"
        onProceed={(task) =>
          void navigate({ to: "/operations/approval/$applicationId", params: { applicationId: task.applicationId } })
        }
      />
    </section>
  );
}

export const Route = createFileRoute("/operations/approval/")({
  component: () => (
    <MenuGuard menuCode="OPS-APPROVAL">
      <ApprovalQueuePage />
    </MenuGuard>
  ),
});
