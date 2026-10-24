import {
  APPLICATION_SUBMIT_MESSAGES,
  type EmergencyContactSectionInput,
  type FormSection,
  formSectionSchema,
  type OccupationSectionInput,
  type PersonalSectionInput,
} from "@cikal/contracts";
import { useState } from "react";
import { ApiError, idempotencyHeader } from "../../lib/api/client";
import { type SectionSave, useCreateDraft, useSaveSection, useSubmitApplication } from "./api";
import type { ApplicationStepValues } from "./application-step-values";
import { formErrors } from "./field-errors";
import { INITIAL_STEPS } from "./labels";

interface Draft {
  id: string;
  loanId: string;
}

/** Isi terakhir tiap section yang tersimpan, untuk kembali ke step itu. */
export interface SectionValues {
  application?: ApplicationStepValues;
  personal?: PersonalSectionInput;
  occupation?: OccupationSectionInput;
  "emergency-contact"?: EmergencyContactSectionInput;
}

export interface Notice {
  type: "success" | "error";
  text: string;
}

interface EntryFlowOptions {
  /** "Back" dari step pertama (AC-39.04). */
  onExit: () => void;
  /** Submit berhasil, dengan pesan "Application submitted. Loan ID: ..." (AC-50.01). */
  onSubmitted: (message: string) => void;
}

const DOCUMENTS: FormSection = "documents";

/**
 * Alur form "New Application" (api-specs 12 §12.1 s.d. §12.8). "Next" menyimpan section dengan `strict=true` lalu
 * pindah ke `nextSection`; "Save as Draft" menyimpan dengan `strict=false` dan tetap di step (AC-49.01). "Next" di step
 * terakhir menjadi "Submit": section disimpan strict, lalu konfirmasi "Submit this application?" mengirim
 * `POST /submit` dengan satu `Idempotency-Key` per konfirmasi (AC-50.07).
 */
export function useEntryFlow({ onExit, onSubmitted }: EntryFlowOptions) {
  const [draft, setDraft] = useState<Draft>();
  const [steps, setSteps] = useState<readonly FormSection[]>(INITIAL_STEPS);
  const [current, setCurrent] = useState<FormSection>("application");
  const [completed, setCompleted] = useState<ReadonlySet<FormSection>>(new Set());
  const [errored, setErrored] = useState<ReadonlySet<FormSection>>(new Set());
  const [values, setValues] = useState<SectionValues>({});
  const [notice, setNotice] = useState<Notice>();
  const [confirming, setConfirming] = useState<"back" | "submit">();
  const [submitKey, setSubmitKey] = useState<Record<string, string>>({});
  const createDraft = useCreateDraft();
  const saveSection = useSaveSection();
  const submit = useSubmitApplication();
  const last = current === steps[steps.length - 1];

  function moveTo(section: FormSection) {
    createDraft.reset();
    saveSection.reset();
    setNotice(undefined);
    setCurrent(section);
  }

  function complete(section: FormSection) {
    setCompleted((done) => new Set(done).add(section));
    setErrored((failed) => new Set([...failed].filter((step) => step !== section)));
  }

  /** "Next" berhasil: step selesai, lalu pindah ke step berikutnya atau buka konfirmasi submit di step terakhir. */
  function advance(section: FormSection, next: FormSection | null) {
    complete(section);
    if (next) {
      moveTo(next);
      return;
    }
    setSubmitKey(idempotencyHeader());
    setConfirming("submit");
  }

  function saved(nextSteps: FormSection[], message: string | undefined) {
    setSteps(nextSteps);
    if (message) setNotice({ type: "success", text: message });
  }

  function saveApplication(input: ApplicationStepValues, strict: boolean) {
    setNotice(undefined);
    if (draft) {
      const identity = values.application?.identity ?? input.identity;
      save(
        { id: draft.id, section: "application", body: input.application, strict },
        {
          application: { application: input.application, identity },
        },
      );
      return;
    }
    const body = { application: input.application, personal: input.identity, strict };
    createDraft.mutate(body, {
      onSuccess: ({ data, message }) => {
        setDraft({ id: data.id, loanId: data.loanId });
        setValues((previous) => ({ ...previous, application: input }));
        saved(data.steps, message);
        if (strict) advance("application", data.currentSection);
      },
    });
  }

  function save(request: SectionSave, value: SectionValues) {
    setNotice(undefined);
    saveSection.mutate(request, {
      onSuccess: ({ data, message }) => {
        setValues((previous) => ({ ...previous, ...value }));
        saved(data.steps, message);
        if (request.strict) advance(request.section, data.nextSection);
      },
    });
  }

  function savePersonal(body: PersonalSectionInput, strict: boolean) {
    if (draft) save({ id: draft.id, section: "personal", body, strict }, { personal: body });
  }

  function saveOccupation(body: OccupationSectionInput, strict: boolean) {
    if (draft) save({ id: draft.id, section: "occupation", body, strict }, { occupation: body });
  }

  function saveEmergencyContact(body: EmergencyContactSectionInput, strict: boolean) {
    if (draft) save({ id: draft.id, section: "emergency-contact", body, strict }, { "emergency-contact": body });
  }

  /** Step Document tidak menyimpan apa pun; file sudah tersimpan saat diunggah. */
  function leaveDocuments() {
    advance(DOCUMENTS, steps[steps.indexOf(DOCUMENTS) + 1] ?? null);
  }

  function submitFailed(error: Error) {
    setConfirming(undefined);
    if (error instanceof ApiError) {
      const sections = error.envelope.details.flatMap(
        (detail) => formSectionSchema.safeParse(detail.section).data ?? [],
      );
      setErrored(new Set(sections));
      if (error.envelope.code === "DOCUMENTS_INCOMPLETE") moveTo(DOCUMENTS);
    }
    setNotice({ type: "error", text: error.message });
  }

  function confirmSubmit() {
    if (!draft) return;
    submit.mutate(
      { id: draft.id, idempotencyKey: submitKey },
      {
        onSuccess: ({ data, message }) => onSubmitted(message ?? APPLICATION_SUBMIT_MESSAGES.submitted(data.loanId)),
        onError: submitFailed,
      },
    );
  }

  function confirmBack() {
    setConfirming(undefined);
    const previous = steps[steps.indexOf(current) - 1];
    if (previous) moveTo(previous);
    else onExit();
  }

  return {
    draft,
    steps,
    current,
    completed,
    errored,
    values,
    notice,
    confirming,
    last,
    errors: formErrors(createDraft.error ?? saveSection.error),
    submitting: createDraft.isPending || saveSection.isPending || submit.isPending,
    saveApplication,
    savePersonal,
    saveOccupation,
    saveEmergencyContact,
    leaveDocuments,
    back: () => setConfirming("back"),
    cancelConfirmation: () => setConfirming(undefined),
    confirmBack,
    confirmSubmit,
  };
}
