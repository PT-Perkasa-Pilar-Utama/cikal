import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { ApplicationDetailView } from "../../../features/application-inquiry/ApplicationDetailView";
import { useApplicationDetail } from "../../../features/application-inquiry/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

/**
 * Halaman "Application Detail" dari Loan ID yang diklik di inquiry atau diketik di address bar (api-specs 12 §12.10).
 * Pengajuan company lain atau Loan ID yang tidak ada menampilkan "Application not found" (AC-84.04, AC-84.05).
 */
function ApplicationDetailPage() {
  const { loanId } = Route.useParams();
  const { data, error } = useApplicationDetail(loanId);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          to="/applications"
          aria-label="Application Inquiry"
          className="rounded-lg p-1.5 text-primary hover:bg-primary-light/40"
        >
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold text-primary">Application Detail</h1>
      </div>
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {!data && !error && <p>Loading...</p>}
      {data && <ApplicationDetailView detail={data} />}
    </section>
  );
}

export const Route = createFileRoute("/applications/loan/$loanId")({
  component: () => (
    <MenuGuard menuCode="APP-INQUIRY">
      <ApplicationDetailPage />
    </MenuGuard>
  ),
});
