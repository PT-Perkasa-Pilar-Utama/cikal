import type { DocumentNumberFormat } from "@cikal/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { BlankSlate } from "../../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { useNumberFormats } from "../../../features/document-numbering/api";
import { FormatForm } from "../../../features/document-numbering/FormatForm";
import { FormatTable } from "../../../features/document-numbering/FormatTable";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

interface Submitted {
  message: string | undefined;
  preview: string;
}

/**
 * Halaman "Document Numbering": format SP3K dan CONTRACT (api-specs 10 §10.3). Ikon edit membuka "Edit Document
 * Numbering"; hasil Submit menampilkan pratinjau dan pesan "Data submitted for approval" (AC-102.01).
 */
function DocumentNumberingPage() {
  const [editing, setEditing] = useState<DocumentNumberFormat | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const { data, isPending, error } = useNumberFormats();
  const actions = useMenuActions("MST-NUMBERING");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Document Numbering</h1>
        <Link
          to="/master/numbering/pending"
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-neutral-0 px-4 py-2.5 font-semibold text-primary hover:bg-primary-light/40"
        >
          <ClipboardList size={20} aria-hidden />
          Pending Document Numbering
        </Link>
      </div>
      {submitted && (
        <FeedbackMessage type="success">
          <span>{submitted.message}</span> <span className="font-semibold">{submitted.preview}</span>
        </FeedbackMessage>
      )}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
        <FormatTable
          formats={data?.data ?? []}
          canUpdate={actions.has("UPDATE")}
          onEdit={(format) => {
            setSubmitted(null);
            setEditing(format);
          }}
        />
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
      </div>
      {editing && (
        <FormatForm
          format={editing}
          onClose={() => setEditing(null)}
          onSubmitted={(message, preview) => {
            setEditing(null);
            setSubmitted({ message, preview });
          }}
        />
      )}
    </section>
  );
}

export const Route = createFileRoute("/master/numbering/")({
  component: () => (
    <MenuGuard menuCode="MST-NUMBERING">
      <DocumentNumberingPage />
    </MenuGuard>
  ),
});
