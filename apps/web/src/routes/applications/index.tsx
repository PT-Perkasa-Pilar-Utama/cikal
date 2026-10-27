import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BlankSlate } from "../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Pagination } from "../../components/ui/Pagination";
import { useApplicationInquiry } from "../../features/application-inquiry/api";
import { InquiryFilters } from "../../features/application-inquiry/InquiryFilters";
import { InquiryTable } from "../../features/application-inquiry/InquiryTable";
import { type InquiryFilter, type InquirySort, nextSort } from "../../features/application-inquiry/inquiry-params";
import { MenuGuard } from "../../features/session/MenuGuard";

const NO_RESULTS = "No applications found";

/**
 * Halaman "Application Inquiry" (api-specs 17 §17.1): cari Loan ID atau nama, saring, urutkan, dan paging 20 baris;
 * daftar dimuat ulang setiap 30 detik agar langkah baru tampil (AC-83.01 s.d. AC-83.07).
 */
function ApplicationInquiryPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<InquiryFilter>({});
  const [sort, setSort] = useState<InquirySort>();
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useApplicationInquiry({ q: q.trim(), page, sort, ...filter });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Application Inquiry</h1>
      <InquiryFilters
        q={q}
        onSearch={(value) => {
          setQ(value);
          setPage(1);
        }}
        onApply={(value) => {
          setFilter(value);
          setPage(1);
        }}
      />
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
        {data && data.data.length > 0 && (
          <InquiryTable items={data.data} sort={sort} onSort={(field) => setSort(nextSort(sort, field))} />
        )}
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate text={NO_RESULTS} />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/applications/")({
  component: () => (
    <MenuGuard menuCode="APP-INQUIRY">
      <ApplicationInquiryPage />
    </MenuGuard>
  ),
});
