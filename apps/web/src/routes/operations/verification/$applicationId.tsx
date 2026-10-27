import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { useVerification } from "../../../features/document-verification/api";
import { VerificationDetail } from "../../../features/document-verification/VerificationDetail";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Verification Detail" (api-specs 15 §15.1); submit berhasil kembali ke antrean dengan pesannya (AC-64.01). */
function VerificationDetailPage() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isPending, error } = useVerification(applicationId);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Verification Detail</h1>
      {isPending && <p>Loading...</p>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {data && (
        <VerificationDetail
          verification={data.data}
          onSubmitted={(notice) => void navigate({ to: "/operations/verification", state: { notice } })}
        />
      )}
    </section>
  );
}

export const Route = createFileRoute("/operations/verification/$applicationId")({
  component: () => (
    <MenuGuard menuCode="OPS-VERIFICATION">
      <VerificationDetailPage />
    </MenuGuard>
  ),
});
