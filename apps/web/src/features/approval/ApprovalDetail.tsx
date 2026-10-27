import type { ApplicationApproval } from "@cikal/contracts";
import { useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { formatMoney, formatPercent } from "../../lib/format";
import { ApprovalChain } from "./ApprovalChain";
import { useFinancing } from "./api";
import { DecisionForm } from "./DecisionForm";
import { FinancingSummary } from "./FinancingSummary";

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-neutral-5">{label}</dt>
      <dd className="font-semibold text-neutral-8">{value}</dd>
    </div>
  );
}

const APPROVED = new Set(["APPROVE", "AUTO_APPROVED"]);

/** Rantai sudah disetujui semua level, jadi struktur kredit dan jadwal angsuran tersedia (api-specs 16 §16.7). */
const fullyApproved = (approval: ApplicationApproval): boolean =>
  approval.chain.length > 0 && approval.chain.every((entry) => APPROVED.has(entry.decision));

/**
 * Isi halaman "Approval Detail" (api-specs 16 §16.5): struktur kredit usulan, rantai approval, form keputusan, dan
 * setelah level final menyetujui, struktur kredit dengan jadwal angsurannya (AC-72.01).
 */
export function ApprovalDetail({ approval }: { approval: ApplicationApproval }) {
  const [notice, setNotice] = useState<string>();
  const approved = fullyApproved(approval);
  const financing = useFinancing(approval.applicationId, approved);
  const range =
    approval.approverRateMin && approval.approverRateMax
      ? `${formatPercent(approval.approverRateMin)}% - ${formatPercent(approval.approverRateMax)}%`
      : "-";
  return (
    <div className="flex flex-col gap-4">
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      <dl className="grid grid-cols-2 gap-4 rounded-lg bg-neutral-0 p-6 shadow-s md:grid-cols-5">
        <Summary label="Loan ID" value={approval.loanId} />
        <Summary label="Requested Limit" value={`Rp${formatMoney(approval.requestedLimit)}`} />
        <Summary label="Tenor" value={`${approval.tenorProposed} months`} />
        <Summary label="Interest Rate" value={`${formatPercent(approval.interestRate)}%`} />
        <Summary label="Approver Rate Range" value={range} />
      </dl>
      <section aria-label="Approval chain" className="rounded-lg bg-neutral-0 p-6 shadow-s">
        <ApprovalChain chain={approval.chain} />
      </section>
      <section aria-label="Decision" className="rounded-lg bg-neutral-0 p-6 shadow-s empty:hidden">
        <DecisionForm approval={approval} onDecided={setNotice} />
      </section>
      {approved && (
        <section aria-label="Approval" className="rounded-lg bg-neutral-0 p-6 shadow-s">
          {financing.error && <FeedbackMessage type="error">{financing.error.message}</FeedbackMessage>}
          {financing.data && <FinancingSummary financing={financing.data.data} />}
        </section>
      )}
    </div>
  );
}
