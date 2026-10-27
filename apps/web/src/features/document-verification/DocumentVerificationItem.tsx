import { VERIFICATION_REMARKS_MAX, type VerificationDocument } from "@cikal/contracts";
import { FileText } from "lucide-react";
import { TextAreaField } from "../../components/ui/TextAreaField";
import type { DocumentValue } from "./verification-values";

const STATUS_OPTIONS = [
  { value: "MATCH", label: "Match" },
  { value: "NOT_MATCH", label: "Not Match" },
] as const;

interface DocumentVerificationItemProps {
  document: VerificationDocument;
  value: DocumentValue;
  editable: boolean;
  selected: boolean;
  error?: string;
  onPreview: () => void;
  onChange: (value: DocumentValue) => void;
}

/**
 * Satu dokumen di "Verification Detail": nama dokumen membuka pratinjau (AC-64.05), pilihan "Match" atau
 * "Not Match", dan "Remarks" untuk Not Match (AC-64.02, AC-64.03).
 */
export function DocumentVerificationItem({
  document,
  value,
  editable,
  selected,
  error,
  onPreview,
  onChange,
}: DocumentVerificationItemProps) {
  return (
    <li className="flex flex-col gap-3 border-b border-neutral-2 py-3 last:border-0">
      <fieldset aria-label={document.label} className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onPreview}
          aria-pressed={selected}
          className={`inline-flex min-w-48 items-center gap-2 text-left font-semibold hover:underline ${
            selected ? "text-primary" : "text-neutral-8"
          }`}
        >
          <FileText size={16} aria-hidden />
          {document.label}
        </button>
        {STATUS_OPTIONS.map((option) => (
          <label key={option.value} className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={`status-${document.documentType}`}
              value={option.value}
              checked={value.verificationStatus === option.value}
              disabled={!editable}
              onChange={() => onChange({ ...value, verificationStatus: option.value })}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {value.verificationStatus === "NOT_MATCH" && (
        <TextAreaField
          label="Remarks"
          required
          maxLength={VERIFICATION_REMARKS_MAX}
          value={value.remarks}
          readOnly={!editable}
          error={error}
          onChange={(event) => onChange({ ...value, remarks: event.target.value })}
        />
      )}
    </li>
  );
}
