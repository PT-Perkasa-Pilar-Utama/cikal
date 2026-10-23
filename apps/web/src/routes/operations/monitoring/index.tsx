import type { MonitoringStatus, ProcessMonitoringItem } from "@cikal/contracts";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BlankSlate } from "../../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { Pagination } from "../../../components/ui/Pagination";
import { SelectField } from "../../../components/ui/SelectField";
import { useProcessMonitoring } from "../../../features/process-monitoring/api";
import { parseStatusFilter, STATUS_OPTIONS } from "../../../features/process-monitoring/labels";
import { MonitoringDetail } from "../../../features/process-monitoring/MonitoringDetail";
import { MonitoringTable } from "../../../features/process-monitoring/MonitoringTable";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

/**
 * Halaman "Process Monitoring" (api-specs 13 §13.3 s.d. §13.5): filter "Status" (AC-86.04), lalu "View Detail"
 * untuk Retry atau Finish. Detail membaca baris dari daftar terbaru agar attempt baru tampil setelah retry gagal
 * (AC-86.03); hasil berhasil tampil sebagai pesan di atas tabel (AC-86.01, AC-86.02).
 */
function ProcessMonitoringPage() {
  const [status, setStatus] = useState<MonitoringStatus>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ProcessMonitoringItem | null>(null);
  const [notice, setNotice] = useState<string>();
  const { data, isPending, error } = useProcessMonitoring(status, page);
  const actions = useMenuActions("OPS-MONITORING");
  const current =
    selected && (data?.data.find((item) => item.processInstanceId === selected.processInstanceId) ?? selected);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Process Monitoring</h1>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
        <div className="max-w-xs">
          <SelectField
            label="Status"
            options={STATUS_OPTIONS}
            value={status ?? ""}
            onChange={(event) => {
              setNotice(undefined);
              setStatus(parseStatusFilter(event.target.value));
              setPage(1);
            }}
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
        {data && (
          <MonitoringTable
            items={data.data}
            onView={(item) => {
              setNotice(undefined);
              setSelected(item);
            }}
          />
        )}
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
      {current && (
        <MonitoringDetail
          item={current}
          canUpdate={actions.has("UPDATE")}
          onClose={() => setSelected(null)}
          onDone={(message) => {
            setSelected(null);
            setNotice(message);
          }}
        />
      )}
    </section>
  );
}

export const Route = createFileRoute("/operations/monitoring/")({
  component: () => (
    <MenuGuard menuCode="OPS-MONITORING">
      <ProcessMonitoringPage />
    </MenuGuard>
  ),
});
