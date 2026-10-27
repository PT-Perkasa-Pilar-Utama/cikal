import type { VerificationDocument } from "@cikal/contracts";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useFileUrl } from "./api";

/** Pratinjau file dokumen di samping daftar dokumen lewat URL bertanda tangan S3 (AC-64.05, api-specs 10 §10.1). */
export function DocumentPreview({ document }: { document: VerificationDocument }) {
  const { data, isPending, error } = useFileUrl(document.fileId);
  return (
    <section aria-label="Document preview" className="flex min-h-[32rem] flex-col gap-3">
      <h2 className="font-semibold text-neutral-8">{document.label}</h2>
      {isPending && <p>Loading...</p>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {data && (
        <iframe
          title={`Preview ${document.label}`}
          src={data.data.url}
          className="w-full flex-1 rounded border border-neutral-2"
        />
      )}
    </section>
  );
}
