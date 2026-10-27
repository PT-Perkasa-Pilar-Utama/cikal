import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useFinancing } from "./api";
import { FinancingSummary } from "./FinancingSummary";

interface ApprovedFinancingProps {
  applicationId: string;
  /** Struktur kredit sudah dibentuk; sebelum itu API menjawab `404 NOT_FOUND` (api-specs 16 §16.7). */
  approved: boolean;
}

/** Struktur kredit dengan jadwal angsurannya setelah level final atau System menyetujui (AC-72.01, AC-74.01). */
export function ApprovedFinancing({ applicationId, approved }: ApprovedFinancingProps) {
  const financing = useFinancing(applicationId, approved);
  if (!approved) return null;
  return (
    <section aria-label="Approval" className="rounded-lg bg-neutral-0 p-6 shadow-s">
      {financing.error && <FeedbackMessage type="error">{financing.error.message}</FeedbackMessage>}
      {financing.data && <FinancingSummary financing={financing.data.data} />}
    </section>
  );
}
