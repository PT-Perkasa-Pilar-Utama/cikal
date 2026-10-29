import type { DocumentNumberFormat } from "@cikal/contracts";
import { Pencil } from "lucide-react";
import { formatDateTime } from "../../lib/format";
import { COUNTER_SCOPE_LABELS, DOCUMENT_TYPE_LABELS, RESET_PERIOD_LABELS } from "./labels";

interface FormatTableProps {
  formats: readonly DocumentNumberFormat[];
  canUpdate: boolean;
  onEdit: (format: DocumentNumberFormat) => void;
}

/** Tabel format ACTIVE per jenis dokumen; format yang sedang diajukan bertanda "Waiting Approval" (api-specs 10 §10.3). */
export function FormatTable({ formats, canUpdate, onEdit }: FormatTableProps) {
  return (
    <table className="w-full" aria-label="Document Numbering">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Document Type</th>
          <th className="p-3">Pattern</th>
          <th className="p-3">Reset Period</th>
          <th className="p-3">Counter Scope</th>
          <th className="p-3">Version</th>
          <th className="p-3">Effective From</th>
          <th className="p-3">Status</th>
          {canUpdate && (
            <th className="p-3">
              <span className="sr-only">Action</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {formats.map((format) => {
          const label = DOCUMENT_TYPE_LABELS[format.documentType];
          return (
            <tr key={format.id} className="border-b border-neutral-2 last:border-0">
              <td className="p-3 font-semibold text-neutral-8">{label}</td>
              <td className="p-3 font-mono">{format.pattern}</td>
              <td className="p-3">{RESET_PERIOD_LABELS[format.resetPeriod]}</td>
              <td className="p-3">{COUNTER_SCOPE_LABELS[format.counterScope]}</td>
              <td className="p-3">{format.versionNumber}</td>
              <td className="p-3">{formatDateTime(format.effectiveFrom)}</td>
              <td className="p-3">{format.hasPendingChange ? "Waiting Approval" : "Active"}</td>
              {canUpdate && (
                <td className="p-3">
                  <button
                    type="button"
                    aria-label={`Edit ${label}`}
                    disabled={format.hasPendingChange}
                    onClick={() => onEdit(format)}
                    className="rounded p-1.5 text-primary hover:bg-primary-light/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
