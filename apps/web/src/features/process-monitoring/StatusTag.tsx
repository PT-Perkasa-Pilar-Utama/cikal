import type { MonitoringStatus } from "@cikal/contracts";
import { STATUS_LABELS, STATUS_TAG_CLASSES } from "./labels";

/** Tag status langkah saat ini (design-system 7.5 Tag). */
export function StatusTag({ status }: { status: MonitoringStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TAG_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
