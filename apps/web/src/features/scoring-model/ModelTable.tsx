import type { ScoringModelListItem } from "@cikal/contracts";
import { Link } from "@tanstack/react-router";
import { MODEL_GROUP_LABELS, MODEL_STATUS_LABELS } from "./labels";

/** Tabel halaman "Scoring Model" (api-specs 22 §22.1); kode model membuka detail versinya. */
export function ModelTable({ models }: { models: ScoringModelListItem[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Model Code</th>
          <th className="p-3">Model Name</th>
          <th className="p-3">Model Group</th>
          <th className="p-3">Product</th>
          <th className="p-3">Version</th>
          <th className="p-3">Status</th>
          <th className="p-3 text-right">Criteria</th>
        </tr>
      </thead>
      <tbody>
        {models.map((model) => (
          <tr key={model.id} className="border-b border-neutral-2 last:border-0">
            <td className="p-3">
              <Link
                to="/master/scoring/$modelId"
                params={{ modelId: model.id }}
                className="font-semibold text-primary hover:underline"
              >
                {model.modelCode}
              </Link>
            </td>
            <td className="p-3">{model.modelName}</td>
            <td className="p-3">{MODEL_GROUP_LABELS[model.modelGroup]}</td>
            <td className="p-3">{model.products.map((product) => product.productCode).join(", ") || "-"}</td>
            <td className="p-3">{model.versionNumber}</td>
            <td className="p-3">{MODEL_STATUS_LABELS[model.status]}</td>
            <td className="p-3 text-right">{model.criteriaCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
