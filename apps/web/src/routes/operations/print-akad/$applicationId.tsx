import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { PrintAkadForm } from "../../../features/disbursement/PrintAkadForm";
import { StepWorkPage } from "../../../features/disbursement/StepWorkPage";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Detail tugas Print Akad; "Print Akad" membuka "Print Akad Form" (api-specs 25 §25.3, AC-77.01). */
function PrintAkadPage() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);
  return (
    <StepWorkPage title="Print Akad" applicationId={applicationId}>
      {() => (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setPrinting(true)}>
              <Printer size={16} aria-hidden />
              Print Akad
            </Button>
          </div>
          {printing && (
            <PrintAkadForm
              applicationId={applicationId}
              onClose={() => setPrinting(false)}
              onPrinted={() => void navigate({ to: "/operations/print-akad" })}
            />
          )}
        </>
      )}
    </StepWorkPage>
  );
}

export const Route = createFileRoute("/operations/print-akad/$applicationId")({
  component: () => (
    <MenuGuard menuCode="OPS-PRINT-AKAD">
      <PrintAkadPage />
    </MenuGuard>
  ),
});
