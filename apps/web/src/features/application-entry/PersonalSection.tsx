import type { PersonalSectionInput } from "@cikal/contracts";
import { type FormEvent, useRef, useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { AddressFields } from "./AddressFields";
import { addressValues } from "./address-values";
import type { ApplicationStepValues } from "./application-step-values";
import { FieldGroup, ParameterSelect } from "./FieldGroup";
import { CONSENT_LABEL } from "./labels";
import { readPersonalStep } from "./personal-step-values";
import { type SectionProps, StepActions } from "./StepActions";

interface PersonalSectionProps extends SectionProps<PersonalSectionInput> {
  /** Identitas pemohon dari step Application, sebagai isi awal field yang sama. */
  identity: ApplicationStepValues["identity"];
}

const ID_TYPE_OPTIONS = [{ value: "KTP", label: "KTP" }];
const PLACEHOLDER = "Type here";

/**
 * Step "Personal" (api-specs 12 §12.3): alamat KTP dan domisili berjenjang, "Same as ID Address" menyalin alamat KTP
 * ke domisili tanpa bisa diedit (AC-40.07), dan centang persetujuan dikirim sebagai `consentGiven` (AC-40.08). Aturan
 * NIK, usia, dan NPWP diperiksa API dan pesannya tampil di bawah field (AC-40.02 s.d. AC-40.06).
 */
export function PersonalSection({
  saved,
  identity,
  onNext,
  onSaveDraft,
  onBack,
  submitting,
  errors,
  last,
}: PersonalSectionProps) {
  const form = useRef<HTMLFormElement>(null);
  const [idAddress, setIdAddress] = useState(() => addressValues(saved?.addresses.id));
  const [residence, setResidence] = useState(() => addressValues(saved?.addresses.residence));
  const [sameAsId, setSameAsId] = useState(saved?.addresses.residence.sameAsId ?? false);
  const [consentGiven, setConsentGiven] = useState(saved?.consentGiven ?? false);

  const read = (target: HTMLFormElement) =>
    readPersonalStep(target, { id: idAddress, residence, sameAsId }, consentGiven);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(read(event.currentTarget));
  }

  function saveDraft() {
    if (form.current) onSaveDraft(read(form.current));
  }

  const defaults: Partial<Record<keyof PersonalSectionInput, unknown>> = saved ?? identity;
  const field = (name: keyof PersonalSectionInput, label: string) => {
    const value = defaults[name];
    return {
      name,
      label,
      defaultValue: typeof value === "string" ? value : undefined,
      error: errors.fields[name],
    };
  };
  const parameter = (name: keyof PersonalSectionInput, label: string) => ({ ...field(name, label), required: true });

  return (
    <form ref={form} aria-label="Personal" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.message && <FeedbackMessage type="error">{errors.message}</FeedbackMessage>}
      <FieldGroup title="Personal Info">
        <TextField {...field("fullName", "Full Name")} required placeholder={PLACEHOLDER} />
        <TextField {...field("fullNameId", "Full Name ID")} required placeholder={PLACEHOLDER} />
        <TextField {...field("placeOfBirth", "Place of Birth")} required placeholder={PLACEHOLDER} />
        <TextField {...field("dateOfBirth", "Date of Birth")} required type="date" />
        <ParameterSelect {...parameter("gender", "Gender")} paramType="Gender" />
        <ParameterSelect {...parameter("religion", "Religion")} paramType="Religion" />
        <ParameterSelect {...parameter("nationality", "Nationality")} paramType="Nationality" />
        <ParameterSelect {...parameter("education", "Education")} paramType="Education" />
        <ParameterSelect {...parameter("marital", "Marital")} paramType="Marital" />
        <TextField {...field("motherMaidenName", "Mother Maiden Name")} required placeholder={PLACEHOLDER} />
      </FieldGroup>
      <FieldGroup title="ID Card Info">
        <SelectField {...field("idType", "ID Type")} required options={ID_TYPE_OPTIONS} />
        <TextField
          {...field("idCardNumber", "ID Card Number")}
          required
          inputMode="numeric"
          placeholder={PLACEHOLDER}
        />
        <TextField {...field("idIssuedDate", "ID Date Issued")} type="date" />
        <TextField {...field("npwpNumber", "NPWP Number")} inputMode="numeric" placeholder={PLACEHOLDER} />
        <TextField {...field("kkNumber", "KK Number")} inputMode="numeric" placeholder={PLACEHOLDER} />
      </FieldGroup>
      <FieldGroup title="Contact Info">
        <TextField {...field("mobileNumber", "Mobile Number")} required inputMode="tel" placeholder={PLACEHOLDER} />
        <TextField {...field("phoneNumber", "Phone Number")} inputMode="tel" placeholder={PLACEHOLDER} />
        <TextField {...field("email", "Email")} type="email" placeholder={PLACEHOLDER} />
      </FieldGroup>
      <FieldGroup title="ID Address">
        <AddressFields value={idAddress} onChange={setIdAddress} errorPrefix="addresses.id" errors={errors.fields} />
      </FieldGroup>
      <FieldGroup title="Residence Address">
        <label className="flex items-center gap-2 font-semibold text-neutral-7 md:col-span-2">
          <input
            type="checkbox"
            checked={sameAsId}
            onChange={(event) => setSameAsId(event.target.checked)}
            className="size-4 accent-primary"
          />
          Same as ID Address
        </label>
        <AddressFields
          value={sameAsId ? idAddress : residence}
          onChange={setResidence}
          errorPrefix="addresses.residence"
          errors={errors.fields}
          readOnly={sameAsId}
        />
      </FieldGroup>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 font-semibold text-neutral-7">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(event) => setConsentGiven(event.target.checked)}
            className="size-4 accent-primary"
          />
          {CONSENT_LABEL}
        </label>
        {errors.fields.consentGiven && <p className="text-xs text-error">{errors.fields.consentGiven}</p>}
      </div>
      <StepActions onBack={onBack} onSaveDraft={saveDraft} submitting={submitting} last={last} />
    </form>
  );
}
