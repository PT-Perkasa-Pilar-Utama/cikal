import type { ApplicationVerification } from "@cikal/contracts";
import { Save, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { ApiError } from "../../lib/api/client";
import { formatDate } from "../../lib/format";
import { useSaveVerification, useSubmitVerification } from "./api";
import { DocumentPreview } from "./DocumentPreview";
import { DocumentVerificationItem } from "./DocumentVerificationItem";
import { initialValues, type VerificationValues, verificationRequest } from "./verification-values";

/** Teks usulan engineering sebelum dokumen dipilih; AC-64.05 hanya mengatur pratinjau setelah nama diklik. */
const PREVIEW_HINT = "Click a document name to preview it";

/** Pesan `details[]` per dokumen, dengan field `documents.<documentType>.remarks` (api-specs 15 §15.3). */
function remarkErrors(error: Error | null): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(
    error.envelope.details.flatMap((detail) => {
      const documentType = detail.field?.match(/^documents\.(.+)\.remarks$/)?.[1];
      return documentType ? [[documentType, detail.message]] : [];
    }),
  );
}

function Summary({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-neutral-5">{label}</dt>
      <dd className="font-semibold text-neutral-8">{value ?? "-"}</dd>
    </div>
  );
}

interface VerificationDetailProps {
  verification: ApplicationVerification;
  onSubmitted: (message: string | undefined) => void;
}

/**
 * Form "Verification Detail" (api-specs 15): status per dokumen, pratinjau di samping daftar (AC-64.05), "Save"
 * sebagian (AC-64.04), dan "Submit" (AC-64.01 s.d. AC-64.03). User yang bukan pemilik tugas hanya membaca.
 */
export function VerificationDetail({ verification, onSubmitted }: VerificationDetailProps) {
  const { applicationId, documents, editable, applicantSummary } = verification;
  const [values, setValues] = useState<VerificationValues>(() => initialValues(documents));
  const [previewType, setPreviewType] = useState<string>();
  const save = useSaveVerification(applicationId);
  const submit = useSubmitVerification(applicationId);
  const busy = save.isPending || submit.isPending;
  const error = save.error ?? submit.error;
  const errors = remarkErrors(error);
  const preview = documents.find((document) => document.documentType === previewType);

  function run(action: "save" | "submit") {
    save.reset();
    submit.reset();
    if (action === "save") save.mutate(verificationRequest(values));
    else submit.mutate(verificationRequest(values), { onSuccess: (result) => onSubmitted(result.message) });
  }

  return (
    <div className="flex flex-col gap-4">
      {save.data?.message && <FeedbackMessage type="success">{save.data.message}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <dl className="grid grid-cols-2 gap-4 rounded-lg bg-neutral-0 p-6 shadow-s md:grid-cols-4">
        <Summary label="Loan ID" value={verification.loanId} />
        <Summary label="Name" value={applicantSummary.fullName} />
        <Summary label="ID Card Number" value={applicantSummary.idCardNumber} />
        <Summary
          label="Date of Birth"
          value={applicantSummary.dateOfBirth && formatDate(applicantSummary.dateOfBirth)}
        />
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-s">
          <ul aria-label="Documents">
            {documents.map((document) => {
              const value = values[document.documentType];
              if (!value) return null;
              return (
                <DocumentVerificationItem
                  key={document.documentType}
                  document={document}
                  value={value}
                  editable={editable && !busy}
                  selected={document.documentType === previewType}
                  error={errors[document.documentType]}
                  onPreview={() => setPreviewType(document.documentType)}
                  onChange={(next) => setValues((current) => ({ ...current, [document.documentType]: next }))}
                />
              );
            })}
          </ul>
          {editable && (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" disabled={busy} onClick={() => run("save")}>
                <Save size={16} aria-hidden />
                Save
              </Button>
              <Button disabled={busy} onClick={() => run("submit")}>
                <Send size={16} aria-hidden />
                Submit
              </Button>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
          {preview ? (
            <DocumentPreview key={preview.fileId} document={preview} />
          ) : (
            <p className="text-neutral-5">{PREVIEW_HINT}</p>
          )}
        </div>
      </div>
    </div>
  );
}
