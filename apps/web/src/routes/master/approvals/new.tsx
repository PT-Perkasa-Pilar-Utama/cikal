import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { useApproverOptions, useBranchOptions, useCreateHierarchy } from "../../../features/approval-hierarchy/api";
import { HierarchyForm } from "../../../features/approval-hierarchy/HierarchyForm";
import { useProductOptions } from "../../../features/product/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "New Hierarchy": berhasil membuka "Approval Hierarchy" dengan pesan pengajuan (AC-27.01). */
function NewHierarchyPage() {
  const create = useCreateHierarchy();
  const navigate = useNavigate();
  const branches = useBranchOptions();
  const products = useProductOptions();
  const approvers = useApproverOptions();
  const sources = [branches, products, approvers];
  const loadError = sources.find((source) => source.error)?.error;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">New Hierarchy</h1>
      <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
        {loadError && <FeedbackMessage type="error">{loadError.message}</FeedbackMessage>}
        {sources.some((source) => source.isPending) && <p>Loading...</p>}
        {branches.data && products.data && approvers.data && (
          <HierarchyForm
            branches={branches.data}
            products={products.data}
            approvers={approvers.data}
            submitting={create.isPending}
            error={create.error?.message}
            onSubmit={(request) =>
              create.mutate(request, {
                onSuccess: (result) => navigate({ to: "/master/approvals", state: { notice: result.message } }),
              })
            }
          />
        )}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/master/approvals/new")({
  component: () => (
    <MenuGuard menuCode="MST-APPROVAL">
      <NewHierarchyPage />
    </MenuGuard>
  ),
});
