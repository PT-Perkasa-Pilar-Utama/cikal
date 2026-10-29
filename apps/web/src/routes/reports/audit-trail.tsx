import type { AuditLogItem } from "@cikal/contracts";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BlankSlate } from "../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Pagination } from "../../components/ui/Pagination";
import { AuditDetailPopup } from "../../features/audit-trail/AuditDetailPopup";
import { AuditFilters } from "../../features/audit-trail/AuditFilters";
import { AuditTable } from "../../features/audit-trail/AuditTable";
import { type AuditSearch, useAuditLogs } from "../../features/audit-trail/api";
import { MenuGuard } from "../../features/session/MenuGuard";
import { todayIsoDate } from "../../lib/format";

/** Periode awal: tanggal 1 bulan berjalan sampai hari ini. */
function currentMonth(): AuditSearch {
  const today = todayIsoDate();
  return { occurredFrom: `${today.slice(0, 8)}01`, occurredTo: today };
}

/**
 * Halaman "Audit Trail" (api-specs 17 §17.2, §17.3): daftar tampil setelah "Search", klik baris membuka data sebelum
 * dan sesudah. Halaman ini hanya membaca jejak audit (AC-14.05).
 */
function AuditTrailPage() {
  const [initial] = useState(currentMonth);
  const [search, setSearch] = useState<AuditSearch | null>(null);
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState<AuditLogItem | null>(null);
  const { data, isFetching, error } = useAuditLogs(search, page);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Audit Trail</h1>
      <AuditFilters
        initial={initial}
        onSearch={(next) => {
          setPage(1);
          setSearch(next);
        }}
      />
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {search && !error && (
        <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
          <AuditTable items={data?.data ?? []} onOpen={setOpened} />
          {isFetching && !data && <p className="p-3">Loading...</p>}
          {data?.data.length === 0 && <BlankSlate />}
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </div>
      )}
      {opened && <AuditDetailPopup id={opened.id} onClose={() => setOpened(null)} />}
    </section>
  );
}

export const Route = createFileRoute("/reports/audit-trail")({
  component: () => (
    <MenuGuard menuCode="RPT-AUDIT">
      <AuditTrailPage />
    </MenuGuard>
  ),
});
