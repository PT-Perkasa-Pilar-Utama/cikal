import { type DecisionMatrixRow, MATRIX_COLUMN_LABELS, MATRIX_COLUMNS } from "@cikal/contracts";
import { Pencil } from "lucide-react";
import { valueLabel } from "./labels";

interface MatrixTableProps {
  rows: DecisionMatrixRow[];
  canUpdate: boolean;
  onEdit: (row: DecisionMatrixRow) => void;
}

const DECISION_CLASSES = { GO: "bg-success-lightest text-success", NOTGO: "bg-error-lightest text-error" } as const;

/**
 * Tabel "Decision Matrix" urut prioritas (api-specs 24 §24.2). Baris yang sedang diajukan tidak bisa diedit sampai
 * Checker memprosesnya.
 */
export function MatrixTable({ rows, canUpdate, onEdit }: MatrixTableProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Priority</th>
          {MATRIX_COLUMNS.map((column) => (
            <th key={column} className="p-3">
              {MATRIX_COLUMN_LABELS[column]}
            </th>
          ))}
          <th className="p-3">Decision</th>
          <th className="p-3">Description</th>
          <th className="p-3">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-neutral-2 last:border-0">
            <td className="p-3 font-semibold text-neutral-8">{row.priority}</td>
            {MATRIX_COLUMNS.map((column) => (
              <td key={column} className="p-3">
                {valueLabel(row[column])}
              </td>
            ))}
            <td className="p-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DECISION_CLASSES[row.decisionOutcome]}`}
              >
                {valueLabel(row.decisionOutcome)}
              </span>
            </td>
            <td className="p-3">{row.description ?? "-"}</td>
            <td className="p-3 text-right">
              {row.hasPendingChange ? (
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Waiting Approval
                </span>
              ) : (
                canUpdate && (
                  <button
                    type="button"
                    aria-label={`Edit Priority ${row.priority}`}
                    onClick={() => onEdit(row)}
                    className="rounded-lg p-1.5 text-primary hover:bg-primary-light/40"
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                )
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
