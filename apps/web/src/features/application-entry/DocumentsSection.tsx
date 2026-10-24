import type { FormEvent } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useApplicationDocuments } from "./api";
import { DocumentSlot } from "./DocumentSlot";
import { StepActions } from "./StepActions";

interface DocumentsSectionProps {
  applicationId: string;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
  last: boolean;
}

/**
 * Step "Document" (api-specs 12 §12.6, §12.7): slot dari checklist pengajuan dengan penghitung dokumen wajib, contoh
 * "1 of 7 documents" (AC-47.01, AC-47.06). File tersimpan saat diunggah, jadi step ini tidak punya "Save as Draft";
 * kelengkapan dokumen diperiksa saat submit (AC-50.02).
 */
export function DocumentsSection({ applicationId, onNext, onBack, submitting, last }: DocumentsSectionProps) {
  const { data, isPending, error } = useApplicationDocuments(applicationId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext();
  }

  return (
    <form aria-label="Document" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {isPending && <p>Loading...</p>}
      {data && (
        <section aria-labelledby="documents-title" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="documents-title" className="text-lg font-bold text-primary">
              Documents
            </h2>
            <p role="status" className="font-semibold text-neutral-6">
              {data.completeness.uploadedMandatory} of {data.completeness.requiredMandatory} documents
            </p>
          </div>
          <ul>
            {data.slots.map((slot) => (
              <DocumentSlot key={slot.documentType} applicationId={applicationId} slot={slot} />
            ))}
          </ul>
        </section>
      )}
      <StepActions onBack={onBack} submitting={submitting} last={last} />
    </form>
  );
}
