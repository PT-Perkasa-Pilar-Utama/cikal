import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RecordDisbursementForm } from "../../../features/disbursement/RecordDisbursementForm";
import { StepWorkPage } from "../../../features/disbursement/StepWorkPage";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Form "Record Disbursement" (api-specs 25 §25.4); hasil kembali ke antrean dengan pesannya (AC-101.01, AC-101.02). */
function RecordDisbursementPage() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <StepWorkPage title="Record Disbursement" applicationId={applicationId}>
      {() => (
        <RecordDisbursementForm
          applicationId={applicationId}
          onDone={(notice) => void navigate({ to: "/operations/disbursement", state: { notice } })}
        />
      )}
    </StepWorkPage>
  );
}

export const Route = createFileRoute("/operations/disbursement/$applicationId")({
  component: () => (
    <MenuGuard menuCode="OPS-DISBURSEMENT">
      <RecordDisbursementPage />
    </MenuGuard>
  ),
});
