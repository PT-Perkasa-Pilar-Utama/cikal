import type { ApplicationDraftListResponse } from "@cikal/contracts";
import { formatDateTime, formatMoney } from "../../lib/format";
import { STEP_LABELS } from "./labels";

type DraftRow = ApplicationDraftListResponse["data"][number];

/**
 * Tabel "Application List": draft milik Sales yang login, termasuk pengajuan yang dikembalikan ke draft (api-specs
 * 12 §12.4). Membuka draft dari Loan ID dipasang di kartu FE-S3-03 (AC-49.05).
 */
export function DraftTable({ drafts }: { drafts: DraftRow[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Loan ID</th>
          <th className="p-3">Full Name</th>
          <th className="p-3">Product</th>
          <th className="p-3">Requested Limit</th>
          <th className="p-3">Step</th>
          <th className="p-3">Status</th>
          <th className="p-3">Last Updated</th>
        </tr>
      </thead>
      <tbody>
        {drafts.map((draft) => (
          <tr key={draft.id} className="border-b border-neutral-2 last:border-0">
            <td className="p-3 font-semibold text-neutral-8">{draft.loanId}</td>
            <td className="p-3">{draft.fullName}</td>
            <td className="p-3">{draft.productCode}</td>
            <td className="p-3">{draft.requestedLimit ? formatMoney(draft.requestedLimit) : "-"}</td>
            <td className="p-3">{STEP_LABELS[draft.currentSection]}</td>
            <td className="p-3">
              <span className="rounded-full bg-neutral-1 px-2.5 py-0.5 text-xs font-semibold text-neutral-5">
                Draft
              </span>
            </td>
            <td className="p-3">{formatDateTime(draft.updatedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
