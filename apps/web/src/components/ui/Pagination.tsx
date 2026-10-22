import type { PageMeta } from "@cikal/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}

const pageButton =
  "rounded-lg p-1.5 text-neutral-6 hover:bg-neutral-1 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40";

/** Footer daftar: jumlah data di kiri, halaman dan tombol prev/next di kanan (design-system 7.3, 8.3). */
export function Pagination({ meta, onPageChange }: PaginationProps) {
  const lastPage = Math.max(meta.totalPages, 1);
  return (
    <div className="flex items-center justify-between border-t border-neutral-2 px-3 py-2.5 text-neutral-5">
      <span>Total {meta.totalItems}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          className={pageButton}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className="font-semibold text-primary">
          {meta.page} / {lastPage}
        </span>
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
