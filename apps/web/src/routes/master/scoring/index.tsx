import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { BlankSlate } from "../../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { Pagination } from "../../../components/ui/Pagination";
import { useScoringModels } from "../../../features/scoring-model/api";
import { ModelTable } from "../../../features/scoring-model/ModelTable";
import { MenuGuard } from "../../../features/session/MenuGuard";

const linkButton =
  "inline-flex items-center gap-2 rounded-lg border border-primary bg-neutral-0 px-4 py-2.5 font-semibold text-primary transition-colors hover:bg-primary-light/40";

/** Halaman "Scoring Model": versi ACTIVE, DRAFT, dan WAITING_APPROVAL tiap model (api-specs 22 §22.1). */
function ScoringModelsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useScoringModels(page);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Scoring Model</h1>
        <Link to="/master/scoring/pending" className={linkButton}>
          <ClipboardList size={20} aria-hidden />
          Pending Scoring Model
        </Link>
      </div>
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="rounded-lg bg-neutral-0 shadow-s">
        <ModelTable models={data?.data ?? []} />
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/master/scoring/")({
  component: () => (
    <MenuGuard menuCode="MST-SCORING">
      <ScoringModelsPage />
    </MenuGuard>
  ),
});
