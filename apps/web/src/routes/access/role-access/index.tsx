import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { BlankSlate } from "../../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { Pagination } from "../../../components/ui/Pagination";
import { useRoleAccessList } from "../../../features/role-access/api";
import { RoleAccessTable } from "../../../features/role-access/RoleAccessTable";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

const linkButton = "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors";

/** Halaman "Role Access" (api-specs 03 §3.3); pesan sukses pengajuan dibawa dari form lewat history state (AC-09.01). */
function RoleAccessPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useRoleAccessList(page);
  const actions = useMenuActions("IAM-ROLE-ACCESS");
  const notice = useRouterState({ select: (state) => state.location.state.notice });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Role Access</h1>
        <div className="flex gap-3">
          <Link
            to="/access/role-access/pending"
            className={`${linkButton} border border-primary bg-neutral-0 text-primary hover:bg-primary-light/40`}
          >
            <ClipboardList size={20} aria-hidden />
            Pending Role Access
          </Link>
          {actions.has("CREATE") && (
            <Link
              to="/access/role-access/new"
              className={`${linkButton} bg-primary text-neutral-0 hover:bg-primary/90`}
            >
              <Plus size={20} aria-hidden />
              New Role Access
            </Link>
          )}
        </div>
      </div>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="rounded-lg bg-neutral-0 shadow-s">
        <RoleAccessTable rows={data?.data ?? []} />
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/access/role-access/")({
  component: () => (
    <MenuGuard menuCode="IAM-ROLE-ACCESS">
      <RoleAccessPage />
    </MenuGuard>
  ),
});
