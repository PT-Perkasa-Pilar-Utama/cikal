import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StepQueue } from "../../../features/disbursement/StepQueue";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Record Disbursement": antrean `DISBURSEMENT` yang akadnya sudah dicetak (AC-101.01). */
function DisbursementQueuePage() {
  const navigate = useNavigate();
  return (
    <StepQueue
      title="Record Disbursement"
      queueCode="DISBURSEMENT"
      proceedLabel="Record Disbursement"
      onProceed={(task) =>
        void navigate({ to: "/operations/disbursement/$applicationId", params: { applicationId: task.applicationId } })
      }
    />
  );
}

export const Route = createFileRoute("/operations/disbursement/")({
  component: () => (
    <MenuGuard menuCode="OPS-DISBURSEMENT">
      <DisbursementQueuePage />
    </MenuGuard>
  ),
});
