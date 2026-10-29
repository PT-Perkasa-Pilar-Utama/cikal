import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StepQueue } from "../../../features/disbursement/StepQueue";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Print Akad": antrean `PRINT_AKAD`; tombol "View Detail" membuka detail tugas (AC-77.01). */
function PrintAkadQueuePage() {
  const navigate = useNavigate();
  return (
    <StepQueue
      title="Print Akad"
      queueCode="PRINT_AKAD"
      proceedLabel="View Detail"
      onProceed={(task) =>
        void navigate({ to: "/operations/print-akad/$applicationId", params: { applicationId: task.applicationId } })
      }
    />
  );
}

export const Route = createFileRoute("/operations/print-akad/")({
  component: () => (
    <MenuGuard menuCode="OPS-PRINT-AKAD">
      <PrintAkadQueuePage />
    </MenuGuard>
  ),
});
