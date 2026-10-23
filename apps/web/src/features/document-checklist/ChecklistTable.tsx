import type { DocumentChecklistListItem } from "@cikal/contracts";
import { OPTIONAL_LABEL } from "./labels";

interface ChecklistTableProps {
  checklists: DocumentChecklistListItem[];
}

/** Tabel halaman "Document Checklist" (api-specs 08 §8.12; design-system 7.1 Table). */
export function ChecklistTable({ checklists }: ChecklistTableProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Product</th>
          <th className="p-3">Occupation</th>
          <th className="p-3">Marital</th>
          <th className="p-3">Documents</th>
          <th className="p-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {checklists.map((checklist) => (
          <tr key={checklist.id} className="border-b border-neutral-2 align-top last:border-0">
            <td className="p-3 font-semibold text-neutral-8">{checklist.product.productName}</td>
            <td className="p-3">{checklist.occupation.paramValue}</td>
            <td className="p-3">{checklist.marital.paramValue}</td>
            <td className="p-3">
              <p className="font-semibold">{checklist.items.length} documents</p>
              <p className="text-sm text-neutral-5">
                {checklist.items
                  .map((item) => (item.isMandatory ? item.documentName : `${item.documentName} (${OPTIONAL_LABEL})`))
                  .join(", ")}
              </p>
            </td>
            <td className="p-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  checklist.isActive ? "bg-success-lightest text-success" : "bg-neutral-1 text-neutral-5"
                }`}
              >
                {checklist.isActive ? "Active" : "Inactive"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
