import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { formatDateTime } from "../../lib/format";
import { EMPTY_VALUE } from "../application-workflow/labels";
import { ResultFields } from "../application-workflow/ResultLayout";
import { comparisonRows, type FieldPresentation } from "../change-request/comparison";
import { DataComparison } from "../change-request/DataComparison";
import { useAuditLog } from "./api";
import { actionLabel, EVENT_TYPE_LABELS } from "./labels";

/** Jejak audit mencatat data dari banyak modul, jadi nama field tampil apa adanya. */
const RAW_FIELDS: FieldPresentation = { labels: {} };
const AUDIT_COLUMNS = { current: "Before", proposed: "After" };

/**
 * Popup detail jejak audit: data sebelum dan sesudah berdampingan dengan field yang berubah ditandai (AC-14.02).
 * Popup hanya punya tombol tutup; jejak audit tidak bisa diubah atau dihapus (AC-14.05).
 */
export function AuditDetailPopup({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error } = useAuditLog(id);
  return (
    <Popup title="Audit Detail" onClose={onClose}>
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {!data && !error && <p>Loading...</p>}
      {data && (
        <div className="flex flex-col gap-4">
          <ResultFields
            fields={[
              ["Date Time", formatDateTime(data.occurredAt)],
              ["User", data.user?.username ?? "System"],
              ["Role", data.role ?? EMPTY_VALUE],
              ["Module", data.module],
              ["Event Type", EVENT_TYPE_LABELS[data.eventType]],
              ["Action", actionLabel(data.action)],
              ["Record", data.recordId ?? EMPTY_VALUE],
              ["IP Address", data.ipAddress ?? EMPTY_VALUE],
              ["Description", data.description ?? EMPTY_VALUE],
            ]}
          />
          {(data.oldData || data.newData) && (
            <DataComparison
              rows={comparisonRows(data.oldData, data.newData ?? {}, data.changedFields, RAW_FIELDS)}
              showCurrent={data.oldData !== null}
              presentation={RAW_FIELDS}
              columnTitles={AUDIT_COLUMNS}
            />
          )}
        </div>
      )}
    </Popup>
  );
}
