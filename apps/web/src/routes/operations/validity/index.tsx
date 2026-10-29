import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StepQueue } from "../../../features/disbursement/StepQueue";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Validity Check": antrean `VALIDITY_CHECK`; tombol "Validity Check" membuka form (AC-76.01). */
function ValidityQueuePage() {
  const navigate = useNavigate();
  return (
    <StepQueue
      title="Validity Check"
      queueCode="VALIDITY_CHECK"
      proceedLabel="Validity Check"
      onProceed={(task) =>
        void navigate({ to: "/operations/validity/$applicationId", params: { applicationId: task.applicationId } })
      }
    />
  );
}

export const Route = createFileRoute("/operations/validity/")({
  component: () => (
    <MenuGuard menuCode="OPS-VALIDITY">
      <ValidityQueuePage />
    </MenuGuard>
  ),
});
