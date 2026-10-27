import type { PageMeta } from "@cikal/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}

/** Nomor halaman yang tampil sekaligus di sekitar halaman aktif. */
const PAGE_WINDOW = 5;

const pageButton =
  "rounded-lg p-1.5 text-neutral-6 hover:bg-neutral-1 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40";

function visiblePages(page: number, lastPage: number): number[] {
  const first = Math.max(1, Math.min(page - Math.floor(PAGE_WINDOW / 2), lastPage - PAGE_WINDOW + 1));
  const last = Math.min(lastPage, first + PAGE_WINDOW - 1);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

/**
 * Footer daftar: jumlah data di kiri, nomor halaman dengan halaman aktif Primary dan tombol prev/next di kanan
 * (design-system 7.3, 8.3; AC-83.05).
 */
export function Pagination({ meta, onPageChange }: PaginationProps) {
  const lastPage = Math.max(meta.totalPages, 1);
  return (
    <div className="flex items-center justify-between border-t border-neutral-2 px-3 py-2.5 text-neutral-5">
      <span>{meta.totalItems} items</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          className={pageButton}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        {visiblePages(meta.page, lastPage).map((page) => (
          <button
            key={page}
            type="button"
            aria-label={`Page ${page}`}
            aria-current={page === meta.page ? "page" : undefined}
            onClick={() => onPageChange(page)}
            className={`min-w-8 rounded-lg px-2 py-1 ${
              page === meta.page ? "bg-primary font-semibold text-neutral-0" : "hover:bg-neutral-1 hover:text-primary"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={meta.page >= lastPage}
          onClick={() => onPageChange(meta.page + 1)}
          className={pageButton}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
