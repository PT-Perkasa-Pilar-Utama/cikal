import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { formatDateTime } from "../../lib/format";
import { useChangeRequest, useReviewChangeRequest } from "./api";
import { comparisonRows, type FieldPresentation } from "./comparison";
import { DataComparison } from "./DataComparison";
import { ACTION_LABELS, ENTITY_TYPE_LABELS, STATUS_LABELS } from "./labels";

type Decision = "approve" | "reject";

/** Teks konfirmasi dari AC-12.01 dan AC-12.03. */
const CONFIRM_MESSAGES: Record<Decision, string> = {
  approve: "Are you sure you want to approve?",
  reject: "Are you sure you want to reject?",
};

interface ChangeRequestDetailProps {
  id: string;
  presentation: FieldPresentation;
  onClose: () => void;
  /** Dipanggil dengan `message` server, contoh "Data approved", setelah approve atau reject berhasil. */
  onReviewed: (message: string | undefined) => void;
}

/**
 * Popup "Detail" layar Pending: perbandingan data (AC-12.02), lalu Approve atau Reject dengan konfirmasi "Yes"
 * (AC-12.01, AC-12.03). Tanpa hak meninjau, tombol diganti `reviewBlockedReason` (AC-12.04); permintaan yang sudah
 * diproses Checker lain menampilkan pesan server (AC-12.05).
 */
export function ChangeRequestDetail({ id, presentation, onClose, onReviewed }: ChangeRequestDetailProps) {
  const detail = useChangeRequest(id);
  const approve = useReviewChangeRequest(id, "approve");
  const reject = useReviewChangeRequest(id, "reject");
  const [confirming, setConfirming] = useState<Decision | null>(null);
  const reviewing = approve.isPending || reject.isPending;
  const reviewError = approve.error ?? reject.error;
  const request = detail.data;

  function confirm(decision: Decision) {
    setConfirming(null);
    const mutation = decision === "approve" ? approve : reject;
    mutation.mutate(undefined, { onSuccess: (result) => onReviewed(result.message) });
  }

  return (
    <Popup title="Detail" onClose={onClose}>
      {detail.isPending && <p>Loading...</p>}
      {detail.error && <FeedbackMessage type="error">{detail.error.message}</FeedbackMessage>}
      {request && (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
            <dt className="text-neutral-5">Type</dt>
            <dd>
              {ENTITY_TYPE_LABELS[request.entityType]} · {ACTION_LABELS[request.action]}
            </dd>
            <dt className="text-neutral-5">Status</dt>
            <dd>{STATUS_LABELS[request.status]}</dd>
            <dt className="text-neutral-5">Submitted By</dt>
            <dd>{request.submittedBy.username}</dd>
            <dt className="text-neutral-5">Submitted At</dt>
            <dd>{formatDateTime(request.submittedAt)}</dd>
          </dl>
          <DataComparison
            rows={comparisonRows(request.currentData, request.proposedData, request.changedFields, presentation)}
            showCurrent={request.currentData !== null}
            presentation={presentation}
          />
          {/* Di samping tombol, bukan di atas tabel yang panjang, agar terlihat tanpa menggulir (AC-12.05). */}
          {reviewError && <FeedbackMessage type="error">{reviewError.message}</FeedbackMessage>}
          {request.canReview ? (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" disabled={reviewing} onClick={() => setConfirming("reject")}>
                <X size={20} aria-hidden />
                Reject
              </Button>
              <Button disabled={reviewing} onClick={() => setConfirming("approve")}>
                <Check size={20} aria-hidden />
                Approve
              </Button>
            </div>
          ) : (
            request.reviewBlockedReason && <FeedbackMessage type="info">{request.reviewBlockedReason}</FeedbackMessage>
          )}
        </>
      )}
      {confirming && (
        <Popup title="Confirmation" size="sm" onClose={() => setConfirming(null)}>
          <p className="text-neutral-8">{CONFIRM_MESSAGES[confirming]}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              No
            </Button>
            <Button onClick={() => confirm(confirming)}>Yes</Button>
          </div>
        </Popup>
      )}
    </Popup>
  );
}
