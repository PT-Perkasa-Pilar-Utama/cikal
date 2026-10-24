import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { BlankSlate } from "../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Pagination } from "../../components/ui/Pagination";
import { TextField } from "../../components/ui/TextField";
import { useDrafts } from "../../features/application-entry/api";
import { DraftTable } from "../../features/application-entry/DraftTable";
import { useMenuActions } from "../../features/session/api";
import { MenuGuard } from "../../features/session/MenuGuard";

/**
 * Halaman "Application List" menu Data Entry: cari Loan ID atau nama, lalu "New Application" (api-specs 12 §12.4).
 * Pesan submit berhasil dibawa dari form lewat history state (AC-50.01).
 */
function ApplicationListPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isPending, error } = useDrafts(page, q);
  const actions = useMenuActions("APP-ENTRY");
  const notice = useRouterState({ select: (state) => state.location.state.notice });

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    setPage(1);
    setQ(typeof value === "string" ? value.trim() : "");
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Application List</h1>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <search className="w-full max-w-sm">
          <form onSubmit={search}>
            <TextField name="q" label="Search" icon={Search} placeholder="Loan ID or Full Name" />
          </form>
        </search>
        {actions.has("CREATE") && (
          <Link
            to="/applications/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-neutral-0 hover:bg-primary/90"
          >
            <Plus size={20} aria-hidden />
            New Application
          </Link>
        )}
      </div>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="rounded-lg bg-neutral-0 shadow-s">
        <DraftTable drafts={data?.data ?? []} />
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/applications/drafts")({
  component: () => (
    <MenuGuard menuCode="APP-ENTRY">
      <ApplicationListPage />
    </MenuGuard>
  ),
});
