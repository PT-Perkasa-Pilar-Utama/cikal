import { createFileRoute } from "@tanstack/react-router";
import { ApplicationWorkflow } from "../../../features/application-workflow/ApplicationWorkflow";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Application Workflow": tombol "Workflow" detail pengajuan membuka timeline prosesnya (US-85). */
function WorkflowPage() {
  const { applicationId } = Route.useParams();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Application Workflow</h1>
      <ApplicationWorkflow applicationId={applicationId} />
    </section>
  );
}

export const Route = createFileRoute("/applications/$applicationId/workflow")({
  component: () => (
    <MenuGuard menuCode="APP-INQUIRY">
      <WorkflowPage />
    </MenuGuard>
  ),
});
