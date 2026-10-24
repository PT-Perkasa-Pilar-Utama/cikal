import type { PersonalSectionInput } from "@cikal/contracts";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { AddressFields } from "./AddressFields";
import type { ApplicationStepValues } from "./application-step-values";
import { FieldGroup, ParameterSelect } from "./FieldGroup";
import type { FormErrors } from "./field-errors";
import { CONSENT_LABEL } from "./labels";
import { addressValues, readPersonalStep } from "./personal-step-values";

interface PersonalSectionProps {
  /** Isi yang sudah disimpan dengan "Next", untuk kembali ke step ini. */
  saved?: PersonalSectionInput;
  /** Identitas pemohon dari step Application, sebagai isi awal field yang sama. */
  identity: ApplicationStepValues["identity"];
  onNext: (input: PersonalSectionInput) => void;
  onBack: () => void;
  submitting: boolean;
  errors: FormErrors;
}

const ID_TYPE_OPTIONS = [{ value: "KTP", label: "KTP" }];
const PLACEHOLDER = "Type here";

/**
 * Step "Personal" (api-specs 12 §12.3): alamat KTP dan domisili berjenjang, "Same as ID Address" menyalin alamat KTP
 * ke domisili tanpa bisa diedit (AC-40.07), dan centang persetujuan dikirim sebagai `consentGiven` (AC-40.08). Aturan
 * NIK, usia, dan NPWP diperiksa API dan pesannya tampil di bawah field (AC-40.02 s.d. AC-40.06).
 */
export function PersonalSection({ saved, identity, onNext, onBack, submitting, errors }: PersonalSectionProps) {
  const [idAddress, setIdAddress] = useState(() => addressValues(saved?.addresses.id));
  const [residence, setResidence] = useState(() => addressValues(saved?.addresses.residence));
  const [sameAsId, setSameAsId] = useState(saved?.addresses.residence.sameAsId ?? false);
  const [consentGiven, setConsentGiven] = useState(saved?.consentGiven ?? false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(readPersonalStep(event.currentTarget, { id: idAddress, residence, sameAsId }, consentGiven));
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
    <form aria-label="Personal" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
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
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden />
          Back
        </Button>
        <Button type="submit" disabled={submitting}>
          Next
          <ArrowRight size={20} aria-hidden />
        </Button>
      </div>
    </form>
  );
}
