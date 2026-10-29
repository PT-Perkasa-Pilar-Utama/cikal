import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StepWorkPage } from "../../../features/disbursement/StepWorkPage";
import { ValidityCheckForm } from "../../../features/disbursement/ValidityCheckForm";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Validity Check Form" (api-specs 25 §25.1, §25.2); hasil kembali ke antrean dengan pesannya (AC-76.01). */
function ValidityCheckPage() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <StepWorkPage title="Validity Check Form" applicationId={applicationId}>
      {(detail) => (
        <ValidityCheckForm
          detail={detail}
          onDone={(notice) => void navigate({ to: "/operations/validity", state: { notice } })}
        />
      )}
    </StepWorkPage>
  );
}

export const Route = createFileRoute("/operations/validity/$applicationId")({
  component: () => (
    <MenuGuard menuCode="OPS-VALIDITY">
      <ValidityCheckPage />
    </MenuGuard>
  ),
});
