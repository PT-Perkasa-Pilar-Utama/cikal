import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { useCreateChecklist, useParameterOptions } from "../../../features/document-checklist/api";
import { ChecklistForm } from "../../../features/document-checklist/ChecklistForm";
import { useProductOptions } from "../../../features/product/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "New Document Checklist": berhasil membuka "Document Checklist" dengan pesan pengajuan (AC-25.01). */
function NewChecklistPage() {
  const create = useCreateChecklist();
  const navigate = useNavigate();
  const products = useProductOptions();
  const occupations = useParameterOptions("Occupation");
  const maritals = useParameterOptions("Marital");
  const documents = useParameterOptions("Document");
  const sources = [products, occupations, maritals, documents];
  const loadError = sources.find((source) => source.error)?.error;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">New Document Checklist</h1>
      <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
        {loadError && <FeedbackMessage type="error">{loadError.message}</FeedbackMessage>}
        {sources.some((source) => source.isPending) && <p>Loading...</p>}
        {products.data && occupations.data && maritals.data && documents.data && (
          <ChecklistForm
            products={products.data}
            occupations={occupations.data}
            maritals={maritals.data}
            documents={documents.data}
            onSubmit={(request) =>
              create.mutate(request, {
                onSuccess: (result) => navigate({ to: "/master/checklists", state: { notice: result.message } }),
              })
            }
            submitting={create.isPending}
            error={create.error?.message}
          />
        )}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/master/checklists/new")({
  component: () => (
    <MenuGuard menuCode="MST-CHECKLIST">
      <NewChecklistPage />
    </MenuGuard>
  ),
});
