import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { ApplicationSection } from "./ApplicationSection";
import { ApplicationStepper } from "./ApplicationStepper";
import { ConfirmationPopup } from "./ConfirmationPopup";
import { DocumentsSection } from "./DocumentsSection";
import type { DraftStart } from "./draft-form-values";
import { EmergencyContactSection } from "./EmergencyContactSection";
import { SUBMIT_CONFIRMATION, UNSAVED_DATA_CONFIRMATION } from "./labels";
import { OccupationSection } from "./OccupationSection";
import { PersonalSection } from "./PersonalSection";
import { useEntryFlow } from "./use-entry-flow";

interface NewApplicationProps {
  onExit: () => void;
  onSubmitted: (message: string) => void;
  /** Draft yang dilanjutkan dari "Application List" (AC-49.05). */
  start?: DraftStart;
}

/**
 * Form "New Application" bertahap (api-specs 12 §12.1): stepper dari `steps[]` dan satu section per step. "Back"
 * membuang isi step yang belum disimpan tanpa memanggil API; dari step pertama kembali ke "Application List"
 * (AC-39.04). Draft yang dikembalikan menampilkan `returnNote` di atas form (AC-64.02, AC-73.02).
 */
export function NewApplication({ onExit, onSubmitted, start }: NewApplicationProps) {
  const flow = useEntryFlow({ onExit, onSubmitted, start });
  const { draft, current, values, errors, submitting, last } = flow;
  const common = { onBack: flow.back, submitting, errors, last };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">New Application</h1>
        {draft && <span className="font-semibold text-neutral-6">Loan ID: {draft.loanId}</span>}
      </div>
      {start?.returnNote && (
        <section aria-label="Return Note">
          <FeedbackMessage type="warning">{start.returnNote}</FeedbackMessage>
        </section>
      )}
      {flow.notice && <FeedbackMessage type={flow.notice.type}>{flow.notice.text}</FeedbackMessage>}
      <div className="flex flex-col gap-6 rounded-lg bg-neutral-0 p-6 shadow-s">
        <ApplicationStepper steps={flow.steps} current={current} completed={flow.completed} errored={flow.errored} />
        {current === "application" && (
          <ApplicationSection
            {...common}
            saved={values.application}
            identityLocked={draft !== undefined}
            onNext={(input) => flow.saveApplication(input, true)}
            onSaveDraft={(input) => flow.saveApplication(input, false)}
          />
        )}
        {current === "personal" && values.application && (
          <PersonalSection
            {...common}
            saved={values.personal}
            identity={values.application.identity}
            onNext={(body) => flow.savePersonal(body, true)}
            onSaveDraft={(body) => flow.savePersonal(body, false)}
          />
        )}
        {current === "occupation" && (
          <OccupationSection
            {...common}
            saved={values.occupation}
            onNext={(body) => flow.saveOccupation(body, true)}
            onSaveDraft={(body) => flow.saveOccupation(body, false)}
            pension={values.application?.application.productCategory === "PENSION"}
          />
        )}
        {current === "documents" && draft && (
          <DocumentsSection applicationId={draft.id} {...common} onNext={flow.leaveDocuments} />
        )}
        {current === "emergency-contact" && (
          <EmergencyContactSection
            {...common}
            saved={values["emergency-contact"]}
            onNext={(body) => flow.saveEmergencyContact(body, true)}
            onSaveDraft={(body) => flow.saveEmergencyContact(body, false)}
          />
        )}
      </div>
      {flow.confirming === "back" && (
        <ConfirmationPopup
          title="Back"
          text={UNSAVED_DATA_CONFIRMATION}
          confirmLabel="OK"
          cancelLabel="Cancel"
          onConfirm={flow.confirmBack}
          onCancel={flow.cancelConfirmation}
        />
      )}
      {flow.confirming === "submit" && (
        <ConfirmationPopup
          title="Submit"
          text={SUBMIT_CONFIRMATION}
          confirmLabel="Yes"
          cancelLabel="No"
          busy={submitting}
          onConfirm={flow.confirmSubmit}
          onCancel={flow.cancelConfirmation}
        />
      )}
    </section>
  );
}
