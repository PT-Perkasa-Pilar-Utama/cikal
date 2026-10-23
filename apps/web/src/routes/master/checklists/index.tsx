import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { BlankSlate } from "../../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { Pagination } from "../../../components/ui/Pagination";
import { useChecklists } from "../../../features/document-checklist/api";
import { ChecklistTable } from "../../../features/document-checklist/ChecklistTable";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

const linkButton = "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors";

/** Halaman "Document Checklist" (api-specs 08 §8.12); pesan sukses pengajuan dibawa dari form (AC-25.01). */
function ChecklistsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useChecklists(page);
  const actions = useMenuActions("MST-CHECKLIST");
  const notice = useRouterState({ select: (state) => state.location.state.notice });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Document Checklist</h1>
        <div className="flex gap-3">
          <Link
            to="/master/checklists/pending"
            className={`${linkButton} border border-primary bg-neutral-0 text-primary hover:bg-primary-light/40`}
          >
            <ClipboardList size={20} aria-hidden />
            Pending Document Checklist
          </Link>
          {actions.has("CREATE") && (
            <Link to="/master/checklists/new" className={`${linkButton} bg-primary text-neutral-0 hover:bg-primary/90`}>
              <Plus size={20} aria-hidden />
              New Document Checklist
            </Link>
          )}
        </div>
      </div>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="rounded-lg bg-neutral-0 shadow-s">
        <ChecklistTable checklists={data?.data ?? []} />
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/master/checklists/")({
  component: () => (
    <MenuGuard menuCode="MST-CHECKLIST">
      <ChecklistsPage />
    </MenuGuard>
  ),
});
