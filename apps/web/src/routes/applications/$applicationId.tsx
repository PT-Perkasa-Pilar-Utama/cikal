import { standardErrors } from "@cikal/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useApplicationForm } from "../../features/application-entry/api";
import { draftStart } from "../../features/application-entry/draft-form-values";
import { NewApplication } from "../../features/application-entry/NewApplication";
import { MenuGuard } from "../../features/session/MenuGuard";

/**
 * Melanjutkan draft dari "Application List" pada step terakhir yang disimpan (api-specs 12 §12.5, AC-49.05).
 * Pengajuan yang sudah disubmit tidak bisa diubah lagi oleh Sales (AC-50.01).
 */
function DraftApplicationPage() {
  const { applicationId } = Route.useParams();
  const { data, error } = useApplicationForm(applicationId);
  const navigate = useNavigate();

  if (error) return <FeedbackMessage type="error">{error.message}</FeedbackMessage>;
  if (!data) return <p>Loading...</p>;
  if (data.data.status !== "DRAFT") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-primary">Loan ID: {data.data.loanId}</h1>
        <FeedbackMessage type="error">{standardErrors.INVALID_STATE.message}</FeedbackMessage>
        <Link
          to="/applications/drafts"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary px-4 py-2.5 font-semibold text-primary hover:bg-primary-light/40"
        >
          <ArrowLeft size={20} aria-hidden />
          Application List
        </Link>
      </section>
    );
  }
  return (
    <NewApplication
      start={draftStart(data)}
      onExit={() => void navigate({ to: "/applications/drafts" })}
      onSubmitted={(notice) => void navigate({ to: "/applications/drafts", state: { notice } })}
    />
  );
}

export const Route = createFileRoute("/applications/$applicationId")({
  component: () => (
    <MenuGuard menuCode="APP-ENTRY">
      <DraftApplicationPage />
    </MenuGuard>
  ),
});
