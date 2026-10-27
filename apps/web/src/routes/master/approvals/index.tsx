import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { BlankSlate } from "../../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { Pagination } from "../../../components/ui/Pagination";
import { useHierarchies } from "../../../features/approval-hierarchy/api";
import { HierarchyTable } from "../../../features/approval-hierarchy/HierarchyTable";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

const linkButton = "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors";

/**
 * Halaman "Approval Hierarchy" (api-specs 16 §16.1) dengan "New Hierarchy" dan "Pending Approval Setup"; pesan
 * pengajuan dibawa dari form lewat history state (AC-27.01).
 */
function ApprovalHierarchyPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useHierarchies(page);
  const actions = useMenuActions("MST-APPROVAL");
  const notice = useRouterState({ select: (state) => state.location.state.notice });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Approval Hierarchy</h1>
        <div className="flex gap-3">
          <Link
            to="/master/approvals/pending"
            className={`${linkButton} border border-primary bg-neutral-0 text-primary hover:bg-primary-light/40`}
          >
            <ClipboardList size={20} aria-hidden />
            Pending Approval Setup
          </Link>
          {actions.has("CREATE") && (
            <Link to="/master/approvals/new" className={`${linkButton} bg-primary text-neutral-0 hover:bg-primary/90`}>
              <Plus size={20} aria-hidden />
              New Hierarchy
            </Link>
          )}
        </div>
      </div>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
        <HierarchyTable hierarchies={data?.data ?? []} />
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/master/approvals/")({
  component: () => (
    <MenuGuard menuCode="MST-APPROVAL">
      <ApprovalHierarchyPage />
    </MenuGuard>
  ),
});
