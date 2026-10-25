import type { DecisionMatrixRow } from "@cikal/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, FlaskConical } from "lucide-react";
import { useState } from "react";
import { BlankSlate } from "../../../components/ui/BlankSlate";
import { Button } from "../../../components/ui/Button";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { Pagination } from "../../../components/ui/Pagination";
import { useDecisionMatrix } from "../../../features/decision-matrix/api";
import { MatrixRowForm } from "../../../features/decision-matrix/MatrixRowForm";
import { MatrixTable } from "../../../features/decision-matrix/MatrixTable";
import { SimulationPopup } from "../../../features/decision-matrix/SimulationPopup";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

/**
 * Halaman "Decision Matrix" (api-specs 24 §24.2, §24.3): ikon edit mengajukan perubahan baris ke Checker (AC-36.01),
 * dan "Simulate" menguji satu kombinasi hasil modul (AC-36.02, AC-36.04).
 */
function DecisionMatrixPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<DecisionMatrixRow | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [notice, setNotice] = useState<string>();
  const { data, isPending, error } = useDecisionMatrix(page);
  const actions = useMenuActions("MST-DECISION");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Decision Matrix</h1>
        <div className="flex gap-3">
          <Link
            to="/master/decision/pending"
            className="inline-flex items-center gap-2 rounded-lg border border-primary bg-neutral-0 px-4 py-2.5 font-semibold text-primary hover:bg-primary-light/40"
          >
            <ClipboardList size={20} aria-hidden />
            Pending Decision Matrix
          </Link>
          <Button
            onClick={() => {
              setNotice(undefined);
              setSimulating(true);
            }}
          >
            <FlaskConical size={20} aria-hidden />
            Simulate
          </Button>
        </div>
      </div>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
        <MatrixTable
          rows={data?.data ?? []}
          canUpdate={actions.has("UPDATE")}
          onEdit={(row) => {
            setNotice(undefined);
            setEditing(row);
          }}
        />
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
      {editing && (
        <MatrixRowForm
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
          }}
        />
      )}
      {simulating && <SimulationPopup onClose={() => setSimulating(false)} />}
    </section>
  );
}

export const Route = createFileRoute("/master/decision/")({
  component: () => (
    <MenuGuard menuCode="MST-DECISION">
      <DecisionMatrixPage />
    </MenuGuard>
  ),
});
