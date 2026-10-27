import { Download } from "lucide-react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useApplicationDocuments } from "../application-entry/api";
import { ResultState, ResultTable } from "../application-workflow/ResultLayout";
import { useDownloadUrl } from "./api";
import { DASH } from "./labels";

/** Tab "Document": dokumen pengajuan dengan ikon "Download" berkas PDF (api-specs 12 §12.6, AC-84.02). */
export function DocumentsPanel({ applicationId }: { applicationId: string }) {
  const { data, error } = useApplicationDocuments(applicationId);
  const download = useDownloadUrl();

  return (
    <div className="flex flex-col gap-3">
      {download.error && <FeedbackMessage type="error">{download.error.message}</FeedbackMessage>}
      <ResultState data={data} error={error}>
        {(documents) => (
          <ResultTable
            caption="Documents"
            headers={["Document", "File", "Download"]}
            rows={documents.slots.map((slot) => [
              slot.label,
              slot.file?.fileName ?? DASH,
              slot.file ? (
                <button
                  key="download"
                  type="button"
                  aria-label={`Download ${slot.label}`}
                  disabled={download.isPending}
                  onClick={() => {
                    const fileId = slot.file?.fileId;
                    if (fileId) download.mutate(fileId, { onSuccess: (url) => window.open(url, "_self") });
                  }}
                  className="rounded-lg p-1.5 text-primary hover:bg-primary-light/40 disabled:opacity-60"
                >
                  <Download size={16} aria-hidden />
                </button>
              ) : (
                DASH
              ),
            ])}
          />
        )}
      </ResultState>
    </div>
  );
}
