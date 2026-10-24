import type { EmergencyContactSectionInput } from "@cikal/contracts";
import { type FormEvent, useRef, useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TextField } from "../../components/ui/TextField";
import { AddressFields } from "./AddressFields";
import { type AddressValues, addressInput, addressValues } from "./address-values";
import { FieldGroup, ParameterSelect } from "./FieldGroup";
import { textInput } from "./form-input";
import { type SectionProps, StepActions } from "./StepActions";

const PLACEHOLDER = "Type here";

function readEmergencyContact(form: HTMLFormElement, address: AddressValues): EmergencyContactSectionInput {
  const data = new FormData(form);
  const text = (name: string) => textInput(data, name);
  return {
    contactName: text("contactName"),
    relationToApplicant: text("relationToApplicant"),
    mobileNumber: text("mobileNumber"),
    homePhoneNumber: text("homePhoneNumber"),
    altPhoneNumber: text("altPhoneNumber"),
    address: addressInput(address),
  };
}

/**
 * Step "Emergency Contact" (api-specs 12 §12.3). Format nomor HP dan nomor yang sama dengan pemohon diperiksa API dan
 * pesannya tampil di bawah "Mobile Number" (AC-48.02 s.d. AC-48.04).
 */
export function EmergencyContactSection({
  saved,
  onNext,
  onSaveDraft,
  onBack,
  submitting,
  errors,
  last,
}: SectionProps<EmergencyContactSectionInput>) {
  const form = useRef<HTMLFormElement>(null);
  const [address, setAddress] = useState(() => addressValues(saved?.address));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(readEmergencyContact(event.currentTarget, address));
  }

  function saveDraft() {
    if (form.current) onSaveDraft(readEmergencyContact(form.current, address));
  }

  const field = (name: Exclude<keyof EmergencyContactSectionInput, "address">, label: string) => ({
    name,
    label,
    defaultValue: saved?.[name],
    error: errors.fields[name],
  });

  return (
    <form ref={form} aria-label="Emergency Contact" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.message && <FeedbackMessage type="error">{errors.message}</FeedbackMessage>}
      <FieldGroup title="Contact Info">
        <TextField {...field("contactName", "Contact Name")} required placeholder={PLACEHOLDER} />
        <ParameterSelect
          {...field("relationToApplicant", "Relation with Applicant")}
          required
          paramType="Relation with Applicant"
        />
        <TextField {...field("mobileNumber", "Mobile Number")} required inputMode="tel" placeholder={PLACEHOLDER} />
        <TextField {...field("homePhoneNumber", "Home Phone Number")} inputMode="tel" placeholder={PLACEHOLDER} />
        <TextField {...field("altPhoneNumber", "Alternative Phone Number")} inputMode="tel" placeholder={PLACEHOLDER} />
      </FieldGroup>
      <FieldGroup title="Contact Address">
        <AddressFields value={address} onChange={setAddress} errorPrefix="address" errors={errors.fields} />
      </FieldGroup>
      <StepActions onBack={onBack} onSaveDraft={saveDraft} submitting={submitting} last={last} />
    </form>
  );
}
