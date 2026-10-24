import type { FormSection, PersonalSectionInput } from "@cikal/contracts";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { ApplicationSection } from "./ApplicationSection";
import { ApplicationStepper } from "./ApplicationStepper";
import { useCreateDraft, useSaveSection } from "./api";
import type { ApplicationStepValues } from "./application-step-values";
import { BackConfirmation } from "./BackConfirmation";
import { formErrors } from "./field-errors";
import { INITIAL_STEPS } from "./labels";
import { PersonalSection } from "./PersonalSection";

interface Draft {
  id: string;
  loanId: string;
}

/**
 * Form "New Application" bertahap (api-specs 12 §12.1). "Next" pertama di step Application membentuk draft dan Loan
 * ID (api-specs 12 §12.2); "Next" berikutnya menyimpan section dengan `strict=true` dan pindah ke `nextSection`.
 * "Back" membuang isi step yang belum disimpan tanpa memanggil API; dari step pertama kembali ke "Application List"
 * (AC-39.04).
 */
export function NewApplication({ onExit }: { onExit: () => void }) {
  const [draft, setDraft] = useState<Draft>();
  const [steps, setSteps] = useState<readonly FormSection[]>(INITIAL_STEPS);
  const [current, setCurrent] = useState<FormSection>("application");
  const [completed, setCompleted] = useState<ReadonlySet<FormSection>>(new Set());
  const [application, setApplication] = useState<ApplicationStepValues>();
  const [personal, setPersonal] = useState<PersonalSectionInput>();
  const [confirmingBack, setConfirmingBack] = useState(false);
  const createDraft = useCreateDraft();
  const saveSection = useSaveSection();
  const errors = formErrors(createDraft.error ?? saveSection.error);
  const submitting = createDraft.isPending || saveSection.isPending;

  function moveTo(section: FormSection) {
    createDraft.reset();
    saveSection.reset();
    setCurrent(section);
  }

  function saved(section: FormSection, result: { steps: FormSection[]; next: FormSection | null }) {
    setSteps(result.steps);
    setCompleted((done) => new Set(done).add(section));
    if (result.next) moveTo(result.next);
  }

  function saveApplication(values: ApplicationStepValues) {
    if (!draft) {
      const body = { application: values.application, personal: values.identity, strict: true };
      createDraft.mutate(body, {
        onSuccess: ({ data }) => {
          setDraft({ id: data.id, loanId: data.loanId });
          setApplication(values);
          saved("application", { steps: data.steps, next: data.currentSection });
        },
      });
      return;
    }
    const identity = application?.identity ?? values.identity;
    saveSection.mutate(
      { id: draft.id, section: "application", body: values.application },
      {
        onSuccess: ({ data }) => {
          setApplication({ application: values.application, identity });
          saved("application", { steps: data.steps, next: data.nextSection });
        },
      },
    );
  }

  function savePersonal(input: PersonalSectionInput) {
    if (!draft) return;
    saveSection.mutate(
      { id: draft.id, section: "personal", body: input },
      {
        onSuccess: ({ data }) => {
          setPersonal(input);
          saved("personal", { steps: data.steps, next: data.nextSection });
        },
      },
    );
  }

  function confirmBack() {
    setConfirmingBack(false);
    const previous = steps[steps.indexOf(current) - 1];
    if (previous) moveTo(previous);
    else onExit();
  }

  const back = () => setConfirmingBack(true);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">New Application</h1>
        {draft && <span className="font-semibold text-neutral-6">Loan ID: {draft.loanId}</span>}
      </div>
      <div className="flex flex-col gap-6 rounded-lg bg-neutral-0 p-6 shadow-s">
        <ApplicationStepper steps={steps} current={current} completed={completed} />
        {current === "application" && (
          <ApplicationSection
            saved={application}
            identityLocked={draft !== undefined}
            onNext={saveApplication}
            onBack={back}
            submitting={submitting}
            errors={errors}
          />
        )}
        {current === "personal" && application && (
          <PersonalSection
            saved={personal}
            identity={application.identity}
            onNext={savePersonal}
            onBack={back}
            submitting={submitting}
            errors={errors}
          />
        )}
        {/* Section Occupation, Document, dan Emergency Contact dipasang di kartu FE-S3-02. */}
        {current !== "application" && current !== "personal" && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={back}>
              <ArrowLeft size={20} aria-hidden />
              Back
            </Button>
          </div>
        )}
      </div>
      {confirmingBack && <BackConfirmation onConfirm={confirmBack} onCancel={() => setConfirmingBack(false)} />}
    </section>
  );
}
