import { ArrowLeft, ArrowRight, Save, Send } from "lucide-react";
import { Button } from "../../components/ui/Button";
import type { FormErrors } from "./field-errors";

/** Kontrak bersama komponen section form pengajuan. */
export interface SectionProps<TValues> {
  /** Isi yang terakhir disimpan, untuk kembali ke step ini. */
  saved?: TValues;
  onNext: (values: TValues) => void;
  onSaveDraft: (values: TValues) => void;
  onBack: () => void;
  submitting: boolean;
  errors: FormErrors;
  /** Step terakhir memakai tombol "Submit" alih-alih "Next" (design-system 8.4). */
  last: boolean;
}

interface StepActionsProps {
  onBack: () => void;
  /** Tanpa handler, tombol "Save as Draft" tidak tampil (step Document menyimpan file saat diunggah). */
  onSaveDraft?: () => void;
  submitting: boolean;
  last: boolean;
}

/** Tombol kanan bawah form stepper: Back, Save as Draft, lalu Next atau Submit (design-system 8.4, AC-48.01). */
export function StepActions({ onBack, onSaveDraft, submitting, last }: StepActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <Button variant="secondary" onClick={onBack}>
        <ArrowLeft size={20} aria-hidden />
        Back
      </Button>
      {onSaveDraft && (
        <Button variant="secondary" onClick={onSaveDraft} disabled={submitting}>
          <Save size={20} aria-hidden />
          Save as Draft
        </Button>
      )}
      <Button type="submit" disabled={submitting}>
        {last ? "Submit" : "Next"}
        {last ? <Send size={20} aria-hidden /> : <ArrowRight size={20} aria-hidden />}
      </Button>
    </div>
  );
}
