import type { ApprovalHierarchy } from "@cikal/contracts";

const level = (jobLevel: number | null, subLevel: number | null): string =>
  jobLevel === null ? "-" : `${jobLevel}.${subLevel}`;

/** Tabel "Approval Hierarchy" (api-specs 16 §16.1); approver nonaktif diberi label "Inactive approver" (AC-27.03). */
export function HierarchyTable({ hierarchies }: { hierarchies: ApprovalHierarchy[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Branch</th>
          <th className="p-3">Product</th>
          <th className="p-3">Job Level</th>
          <th className="p-3">Sub Level</th>
          <th className="p-3">Description</th>
          <th className="p-3">Approver</th>
          <th className="p-3">Up Level</th>
        </tr>
      </thead>
      <tbody>
        {hierarchies.map((hierarchy) => (
          <tr key={hierarchy.id} className="border-b border-neutral-2 last:border-0">
            <td className="p-3">{hierarchy.branch.branchCode}</td>
            <td className="p-3">{hierarchy.product.productCode}</td>
            <td className="p-3">{hierarchy.jobLevel}</td>
            <td className="p-3">{hierarchy.subLevel}</td>
            <td className="p-3">{hierarchy.levelDescription}</td>
            <td className="p-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-neutral-8">{hierarchy.approver.username}</span>
                {hierarchy.approverInactive && (
                  <span className="rounded-full bg-error-lightest px-2.5 py-0.5 text-xs font-semibold text-error">
                    Inactive approver
                  </span>
                )}
              </span>
            </td>
            <td className="p-3">{level(hierarchy.upLevel, hierarchy.upSubLevel)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
