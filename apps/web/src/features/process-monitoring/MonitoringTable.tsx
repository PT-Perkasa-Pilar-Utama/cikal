import { type ProcessMonitoringItem, stepNames } from "@cikal/contracts";
import { Eye } from "lucide-react";
import { formatDateTime } from "../../lib/format";
import { orDash } from "./labels";
import { StatusTag } from "./StatusTag";

interface MonitoringTableProps {
  items: ProcessMonitoringItem[];
  onView: (item: ProcessMonitoringItem) => void;
}

/** Tabel pengajuan berjalan dengan langkah saat ini dan pesan error-nya (api-specs 13 §13.3; AC-86.04). */
export function MonitoringTable({ items, onView }: MonitoringTableProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Loan ID</th>
          <th className="p-3">Name</th>
          <th className="p-3">Branch</th>
          <th className="p-3">Step</th>
          <th className="p-3">Status</th>
          <th className="p-3">Attempt</th>
          <th className="p-3">Error Message</th>
          <th className="p-3">Started At</th>
          <th className="p-3">
            <span className="sr-only">Detail</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.currentStep.stepExecutionId} className="border-b border-neutral-2 last:border-0">
            <td className="p-3 font-semibold text-neutral-8">{item.loanId}</td>
            <td className="p-3">{orDash(item.fullName)}</td>
            <td className="p-3">{orDash(item.branchCode)}</td>
            <td className="p-3">{stepNames[item.currentStep.stepCode]}</td>
            <td className="p-3">
              <StatusTag status={item.currentStep.status} />
            </td>
            <td className="p-3">{item.currentStep.attempt}</td>
            <td className="p-3 text-error">{item.currentStep.errorMessage}</td>
            <td className="p-3">{item.currentStep.startedAt && formatDateTime(item.currentStep.startedAt)}</td>
            <td className="p-3 text-right">
              <button
                type="button"
                aria-label={`View Detail ${item.loanId}`}
                onClick={() => onView(item)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold whitespace-nowrap text-primary hover:bg-primary-light/40"
              >
                <Eye size={16} aria-hidden />
                View Detail
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
