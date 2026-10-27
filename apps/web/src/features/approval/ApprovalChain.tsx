import type { ApprovalChainEntry, ApprovalDecision } from "@cikal/contracts";
import { formatDateTime } from "../../lib/format";

const DECISION_LABELS: Record<ApprovalDecision, string> = {
  PENDING: "Pending",
  APPROVE: "Approved",
  REJECT: "Rejected",
  RETURN: "Returned",
  AUTO_APPROVED: "Auto Approved",
};

/** Rantai approval dari level terendah dengan keputusan tiap level (api-specs 16 §16.5, AC-72.02). */
export function ApprovalChain({ chain }: { chain: ApprovalChainEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table aria-label="Approval Chain" className="w-full text-left">
        <thead className="bg-neutral-1 text-sm text-neutral-7">
          <tr>
            <th className="px-3 py-2">Level</th>
            <th className="px-3 py-2">Sub Level</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Approver</th>
            <th className="px-3 py-2">Decision</th>
            <th className="px-3 py-2">Comment</th>
            <th className="px-3 py-2">Decided At</th>
          </tr>
        </thead>
        <tbody>
          {chain.map((entry) => (
            <tr key={`${entry.jobLevel}-${entry.subLevel}`} className="border-b border-neutral-2 last:border-0">
              <td className="px-3 py-2">{entry.jobLevel}</td>
              <td className="px-3 py-2">{entry.subLevel}</td>
              <td className="px-3 py-2">{entry.description}</td>
              <td className="px-3 py-2">{entry.approver.username}</td>
              <td className="px-3 py-2 font-semibold">{DECISION_LABELS[entry.decision]}</td>
              <td className="px-3 py-2">{entry.comment ?? "-"}</td>
              <td className="px-3 py-2">{entry.decidedAt ? formatDateTime(entry.decidedAt) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
