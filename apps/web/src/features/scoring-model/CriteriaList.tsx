import type { ScoringCriterion } from "@cikal/contracts";
import { Pencil } from "lucide-react";
import { BlankSlate } from "../../components/ui/BlankSlate";
import { CRITERION_TYPE_LABELS } from "./labels";

interface CriteriaListProps {
  criteria: ScoringCriterion[];
  /** Ada hanya untuk draft yang boleh diubah user sesi. */
  onEdit?: (criterion: ScoringCriterion) => void;
}

/** Daftar kriteria model dengan teks server, contoh "Occupation is one of ASN, Karyawan BUMN : +50" (AC-37.01). */
export function CriteriaList({ criteria, onEdit }: CriteriaListProps) {
  if (criteria.length === 0) return <BlankSlate />;
  return (
    <table aria-label="Criteria" className="w-full text-left">
      <thead className="bg-neutral-1 text-sm text-neutral-7">
        <tr>
          <th className="px-3 py-2">Criterion</th>
          <th className="px-3 py-2">Criterion Type</th>
          {onEdit && (
            <th className="px-3 py-2">
              <span className="sr-only">Action</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {criteria.map((criterion) => (
          <tr key={criterion.id} className="border-b border-neutral-2 last:border-0">
            <td className="px-3 py-2 text-neutral-8">{criterion.displayText}</td>
            <td className="px-3 py-2">{CRITERION_TYPE_LABELS[criterion.criterionType]}</td>
            {onEdit && (
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  aria-label={`Edit ${criterion.displayText}`}
                  onClick={() => onEdit(criterion)}
                  className="rounded-lg p-2 text-primary hover:bg-primary-light/40"
                >
                  <Pencil size={16} aria-hidden />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
