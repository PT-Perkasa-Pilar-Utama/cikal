import { createFileRoute } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { ApprovalDetail } from "../../../features/approval/ApprovalDetail";
import { useApproval } from "../../../features/approval/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Approval Detail" (api-specs 16 §16.5). */
function ApprovalDetailPage() {
  const { applicationId } = Route.useParams();
  const { data, isPending, error } = useApproval(applicationId);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Approval Detail</h1>
      {isPending && <p>Loading...</p>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {data && <ApprovalDetail approval={data.data} />}
    </section>
  );
}

export const Route = createFileRoute("/operations/approval/$applicationId")({
  component: () => (
    <MenuGuard menuCode="OPS-APPROVAL">
      <ApprovalDetailPage />
    </MenuGuard>
  ),
});
