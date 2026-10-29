import {
  type CounterScope,
  counterScopeSchema,
  type DocumentNumberFormat,
  type ResetPeriod,
  resetPeriodSchema,
} from "@cikal/contracts";
import { Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../lib/api/client";
import { useNumberPreview, useUpdateNumberFormat } from "./api";
import { COUNTER_SCOPE_OPTIONS, DOCUMENT_TYPE_LABELS, RESET_PERIOD_OPTIONS } from "./labels";
import { useDebouncedValue } from "./use-debounced-value";

const PREVIEW_DELAY_MS = 300;

/** Kode error pola (api-specs 10 §10.5); pesannya tampil di bawah field "Pattern" (AC-102.04, AC-102.05). */
const PATTERN_ERRORS: ReadonlySet<string> = new Set(["INVALID_SEQUENCE_TOKEN", "UNKNOWN_TOKEN"]);

const isPatternError = (error: Error | null): error is ApiError =>
  error instanceof ApiError && PATTERN_ERRORS.has(error.envelope.code);

interface FormatFormProps {
  format: DocumentNumberFormat;
  onClose: () => void;
  /** Dipanggil dengan pesan server dan pratinjau nomor format yang diajukan (AC-102.01). */
  onSubmitted: (message: string | undefined, preview: string) => void;
}

/**
 * Popup "Edit Document Numbering": pola, "Reset Period", dan "Counter Scope" dengan pratinjau langsung (api-specs 10
 * §10.4). "Submit" mengajukan format ke Checker; format lama tetap dipakai sampai disetujui (AC-102.01).
 */
export function FormatForm({ format, onClose, onSubmitted }: FormatFormProps) {
  const [pattern, setPattern] = useState(format.pattern);
  const [resetPeriod, setResetPeriod] = useState<ResetPeriod>(format.resetPeriod);
  const [counterScope, setCounterScope] = useState<CounterScope>(format.counterScope);
  const update = useUpdateNumberFormat(format.documentType);
  const previewPattern = useDebouncedValue(pattern, PREVIEW_DELAY_MS);
  const preview = useNumberPreview({
    documentType: format.documentType,
    pattern: previewPattern,
    resetPeriod,
    counterScope,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate(
      { pattern, resetPeriod, counterScope },
      { onSuccess: (result) => onSubmitted(result.message, result.data.preview) },
    );
  }

  // Pratinjau pola sebelumnya tampil pudar sampai pratinjau pola yang sedang diketik selesai dimuat.
  const stalePreview = pattern !== previewPattern || preview.isPlaceholderData;
  const patternError = [update.error, preview.error].find(isPatternError)?.message;
  const formError = update.error && !isPatternError(update.error) ? update.error.message : undefined;

  return (
    <Popup title="Edit Document Numbering" onClose={onClose}>
      <form aria-label="Document Numbering" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <FeedbackMessage type="error">{formError}</FeedbackMessage>}
        <TextField label="Document Type" value={DOCUMENT_TYPE_LABELS[format.documentType]} readOnly />
        <TextField
          label="Pattern"
          required
          maxLength={100}
          value={pattern}
          error={patternError}
          onChange={(event) => {
            update.reset();
            setPattern(event.target.value);
          }}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Reset Period"
            required
            options={RESET_PERIOD_OPTIONS}
            value={resetPeriod}
            onChange={(event) => setResetPeriod(resetPeriodSchema.parse(event.target.value))}
          />
          <SelectField
            label="Counter Scope"
            required
            options={COUNTER_SCOPE_OPTIONS}
            value={counterScope}
            onChange={(event) => setCounterScope(counterScopeSchema.parse(event.target.value))}
          />
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg bg-neutral-1 p-3">
          <span className="text-neutral-5">Preview</span>
          <output
            aria-label="Preview"
            aria-busy={stalePreview || undefined}
            className={`font-semibold ${stalePreview ? "text-neutral-4" : "text-neutral-8"}`}
          >
            {!patternError && preview.data ? preview.data.data.preview : "-"}
          </output>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending || !pattern.trim()}>
            <Send size={20} aria-hidden />
            Submit
          </Button>
        </div>
      </form>
    </Popup>
  );
}
