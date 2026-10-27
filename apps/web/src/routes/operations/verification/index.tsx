import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { MenuGuard } from "../../../features/session/MenuGuard";
import { TaskQueue } from "../../../features/task-queue/TaskQueue";

/**
 * Halaman "Verification Document": antrean tugas `VERIFICATION` dengan komponen antrean generik (api-specs 14 §14.2).
 * "Proceed to Verification" membuka "Verification Detail" (AC-64.01); pesan submit dibawa lewat history state.
 */
function VerificationQueuePage() {
  const navigate = useNavigate();
  const notice = useRouterState({ select: (state) => state.location.state.notice });
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Verification Document</h1>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      <TaskQueue
        queueCode="VERIFICATION"
        proceedLabel="Proceed to Verification"
        onProceed={(task) =>
          void navigate({
            to: "/operations/verification/$applicationId",
            params: { applicationId: task.applicationId },
          })
        }
      />
    </section>
  );
}

export const Route = createFileRoute("/operations/verification/")({
  component: () => (
    <MenuGuard menuCode="OPS-VERIFICATION">
      <VerificationQueuePage />
    </MenuGuard>
  ),
});
