import { Inbox } from "lucide-react";

const DEFAULT_TEXT = "No data";

/** Keadaan kosong daftar dengan ikon dan pesan (design-system 7.5 Blank Slate). */
export function BlankSlate({ text = DEFAULT_TEXT }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-6 text-neutral-5">
      <Inbox size={20} aria-hidden />
      <p>{text}</p>
    </div>
  );
}
