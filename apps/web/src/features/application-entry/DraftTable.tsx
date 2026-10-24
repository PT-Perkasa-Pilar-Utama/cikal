import type { ApplicationDraftListResponse } from "@cikal/contracts";
import { Link } from "@tanstack/react-router";
import { formatDateTime, formatMoney } from "../../lib/format";
import { STEP_LABELS } from "./labels";

type DraftRow = ApplicationDraftListResponse["data"][number];

/**
 * Tabel "Application List": draft milik Sales yang login, termasuk pengajuan yang dikembalikan ke draft (api-specs
 * 12 §12.4). Loan ID membuka draft pada step terakhir yang disimpan (AC-49.05).
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
            <td className="p-3">
              <Link
                to="/applications/$applicationId"
                params={{ applicationId: draft.id }}
                className="font-semibold text-primary hover:underline"
              >
                {draft.loanId}
              </Link>
            </td>
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
