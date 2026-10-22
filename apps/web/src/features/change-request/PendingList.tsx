import type { ChangeRequestEntityType } from "@cikal/contracts";
import { Eye } from "lucide-react";
import { useState } from "react";
import { BlankSlate } from "../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Pagination } from "../../components/ui/Pagination";
import { formatDateTime } from "../../lib/format";
import { usePendingChangeRequests } from "./api";
import { ChangeRequestDetail } from "./ChangeRequestDetail";
import type { FieldPresentation } from "./comparison";
import { ACTION_LABELS, ENTITY_TYPE_LABELS, STATUS_LABELS } from "./labels";

interface PendingListProps {
  title: string;
  entityTypes: ChangeRequestEntityType[];
  presentation: FieldPresentation;
}

/**
 * Layar "Pending <Data>" generik untuk semua data master checker-maker (api-specs 07 §7.2; design-system 8.3).
 * Hasil approve atau reject tampil sebagai pesan di atas tabel dan barisnya hilang setelah daftar dimuat ulang
 * (AC-12.01, AC-12.03).
 */
export function PendingList({ title, entityTypes, presentation }: PendingListProps) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>();
  const { data, isPending, error } = usePendingChangeRequests(entityTypes, page);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">{title}</h1>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="rounded-lg bg-neutral-0 shadow-s">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-2 text-left text-neutral-5">
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Action</th>
              <th className="p-3">Submitted By</th>
              <th className="p-3">Submitted At</th>
              <th className="p-3">Status</th>
              <th className="p-3">
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((item) => (
              <tr key={item.id} className="border-b border-neutral-2 last:border-0">
                <td className="p-3 font-semibold text-neutral-8">{item.displayName}</td>
                <td className="p-3">{ENTITY_TYPE_LABELS[item.entityType]}</td>
                <td className="p-3">{ACTION_LABELS[item.action]}</td>
                <td className="p-3">{item.submittedBy.username}</td>
                <td className="p-3">{formatDateTime(item.submittedAt)}</td>
                <td className="p-3">
                  <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    aria-label={`Detail ${item.displayName}`}
                    onClick={() => {
                      setNotice(undefined);
                      setOpenId(item.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-primary hover:bg-primary-light/40"
                  >
                    <Eye size={16} aria-hidden />
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
      {openId && (
        <ChangeRequestDetail
          id={openId}
          presentation={presentation}
          onClose={() => setOpenId(null)}
          onReviewed={(message) => {
            setOpenId(null);
            setNotice(message);
          }}
        />
      )}
    </section>
  );
}
