import { LoaderCircle } from "lucide-react";
import { FeedbackMessage } from "../ui/FeedbackMessage";

/** Layar penuh selama sesi dimuat, agar halaman aplikasi tidak tampil sebelum sesi terbukti aktif (AC-06.01). */
export function FullPageStatus({ error }: { error?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      {error ? (
        <FeedbackMessage type="error">{error}</FeedbackMessage>
      ) : (
        <div role="status" className="flex items-center gap-2 text-neutral-5">
          <LoaderCircle size={20} className="animate-spin text-primary" aria-hidden />
          Loading...
        </div>
      )}
    </div>
  );
}
