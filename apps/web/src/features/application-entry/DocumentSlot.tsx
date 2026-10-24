import type { ApplicationDocumentsResponse } from "@cikal/contracts";
import { FileText, RefreshCw, Upload } from "lucide-react";
import { type ChangeEvent, useRef } from "react";
import { Button } from "../../components/ui/Button";
import { useUploadDocument } from "./api";

type Slot = ApplicationDocumentsResponse["data"]["slots"][number];

/** Ekstensi yang diterima API (api-specs 12 §12.7); ditawarkan pemilih file, tetap diperiksa server (AC-47.02). */
const ACCEPTED_FILES = ".png,.jpg,.jpeg,.pdf,.docx";

/**
 * Satu slot unggah step "Document" (design-system 7.1 Upload): nama file berstatus "Uploaded" (AC-47.01), label
 * "Optional" untuk dokumen tidak wajib (AC-47.06), dan ikon ganti untuk slot berisi (AC-47.05). Pesan tolak API tampil
 * di bawah slot (AC-47.02, AC-47.04).
 */
export function DocumentSlot({ applicationId, slot }: { applicationId: string; slot: Slot }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument(applicationId);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) upload.mutate({ documentType: slot.documentType, file });
  }

  return (
    <li className="flex flex-col gap-1.5 border-b border-neutral-2 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-40 font-semibold text-neutral-8">{slot.label}</span>
        {!slot.isMandatory && (
          <span className="rounded-full bg-neutral-1 px-2.5 py-0.5 text-xs font-semibold text-neutral-5">Optional</span>
        )}
        <span className="flex flex-1 items-center gap-2">
          {slot.file && (
            <>
              <FileText size={16} aria-hidden className="text-neutral-5" />
              <span>{slot.file.fileName}</span>
              <span className="rounded-full bg-success-lightest px-2.5 py-0.5 text-xs font-semibold text-success">
                Uploaded
              </span>
            </>
          )}
          {upload.isPending && <span className="text-neutral-5">Uploading...</span>}
        </span>
        <input
          ref={input}
          type="file"
          hidden
          accept={ACCEPTED_FILES}
          aria-label={`File ${slot.label}`}
          onChange={choose}
        />
        {slot.file ? (
          <button
            type="button"
            aria-label={`Replace ${slot.label}`}
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
            className="rounded-lg p-2 text-primary hover:bg-primary-light/40 disabled:opacity-60"
          >
            <RefreshCw size={16} aria-hidden />
          </button>
        ) : (
          <Button
            variant="secondary"
            aria-label={`Upload ${slot.label}`}
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
          >
            <Upload size={16} aria-hidden />
            Upload
          </Button>
        )}
      </div>
      {upload.error && <p className="text-xs text-error">{upload.error.message}</p>}
    </li>
  );
}
