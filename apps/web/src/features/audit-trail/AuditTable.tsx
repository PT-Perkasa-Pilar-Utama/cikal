import type { AuditLogItem } from "@cikal/contracts";
import { Eye } from "lucide-react";
import { formatDateTime } from "../../lib/format";
import { EMPTY_VALUE } from "../application-workflow/labels";
import { actionLabel } from "./labels";

interface AuditTableProps {
  items: readonly AuditLogItem[];
  onOpen: (item: AuditLogItem) => void;
}

const SYSTEM_USER = "System";

/** Kolom Date Time, User, Module, Action, Record, dan IP Address; klik baris membuka detailnya (AC-14.01, AC-14.06). */
export function AuditTable({ items, onOpen }: AuditTableProps) {
  return (
    <table className="w-full" aria-label="Audit Trail">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Date Time</th>
          <th className="p-3">User</th>
          <th className="p-3">Module</th>
          <th className="p-3">Action</th>
          <th className="p-3">Record</th>
          <th className="p-3">IP Address</th>
          <th className="p-3">
            <span className="sr-only">Detail</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            onClick={() => onOpen(item)}
            className="cursor-pointer border-b border-neutral-2 last:border-0 hover:bg-neutral-1"
          >
            <td className="p-3 whitespace-nowrap">{formatDateTime(item.occurredAt)}</td>
            <td className="p-3">{item.user?.username ?? SYSTEM_USER}</td>
            <td className="p-3">{item.module}</td>
            <td className="p-3">{actionLabel(item.action)}</td>
            <td className="p-3">{item.recordId ?? EMPTY_VALUE}</td>
            <td className="p-3">{item.ipAddress ?? EMPTY_VALUE}</td>
            <td className="p-3">
              <button
                type="button"
                aria-label={`Detail ${actionLabel(item.action)} ${item.recordId ?? item.module}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(item);
                }}
                className="rounded p-1.5 text-primary hover:bg-primary-light/40"
              >
                <Eye size={16} aria-hidden />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
