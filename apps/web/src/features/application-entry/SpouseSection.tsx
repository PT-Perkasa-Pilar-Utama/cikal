import type { SpouseSectionInput } from "@cikal/contracts";
import { type FormEvent, useRef, useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TextField } from "../../components/ui/TextField";
import { formatMoney, isMoneyValue } from "../../lib/format";
import { AddressFields } from "./AddressFields";
import { addressValues } from "./address-values";
import { readSpouseStep } from "./conditional-step-values";
import { FieldGroup, ParameterSelect } from "./FieldGroup";
import { type SectionProps, StepActions } from "./StepActions";

const PLACEHOLDER = "Type here";

const money = (value: string | undefined) => (value && isMoneyValue(value) ? formatMoney(value) : value);

/**
 * Step "Spouse" untuk pemohon kawin (api-specs 12 §12.3, US-43). NIK pasangan yang sama dengan NIK pemohon ditolak
 * API dan pesannya tampil di bawah field (AC-43.02).
 */
export function SpouseSection({
  saved,
  onNext,
  onSaveDraft,
  onBack,
  submitting,
  errors,
  last,
}: SectionProps<SpouseSectionInput>) {
  const form = useRef<HTMLFormElement>(null);
  const [idAddress, setIdAddress] = useState(() => addressValues(saved?.idAddress));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(readSpouseStep(event.currentTarget, idAddress));
  }

  function saveDraft() {
    if (form.current) onSaveDraft(readSpouseStep(form.current, idAddress));
  }

  const field = (name: keyof SpouseSectionInput, label: string) => {
    const value = saved?.[name];
    return { name, label, defaultValue: typeof value === "string" ? value : undefined, error: errors.fields[name] };
  };

  return (
    <form ref={form} aria-label="Spouse" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.message && <FeedbackMessage type="error">{errors.message}</FeedbackMessage>}
      <FieldGroup title="Spouse Info">
        <TextField {...field("fullName", "Spouse Full Name")} required placeholder={PLACEHOLDER} />
        <TextField {...field("idNumber", "Spouse ID Number")} required inputMode="numeric" placeholder={PLACEHOLDER} />
        <TextField {...field("dateOfBirth", "Spouse Date of Birth")} required type="date" />
        <TextField {...field("mobileNumber", "Spouse Mobile Number")} inputMode="tel" placeholder={PLACEHOLDER} />
        <ParameterSelect
          {...field("prenuptialAgreement", "Prenuptial Agreement")}
          required
          paramType="Prenuptial Agreement"
        />
      </FieldGroup>
      <FieldGroup title="Spouse Occupation">
        <ParameterSelect {...field("occupation", "Spouse Occupation")} paramType="Occupation" />
        <ParameterSelect
          {...field("industryOfProfession", "Industry of Profession")}
          paramType="Industry of Profession"
        />
        <TextField {...field("position", "Position")} placeholder={PLACEHOLDER} />
        <ParameterSelect {...field("sourceOfFunds", "Source of Fund")} paramType="Source of Fund" />
        <TextField
          {...field("monthlyIncome", "Spouse Monthly Income")}
          inputMode="numeric"
          placeholder={PLACEHOLDER}
          defaultValue={money(saved?.monthlyIncome)}
        />
        <TextField
          {...field("monthlySpending", "Spouse Monthly Spending")}
          inputMode="numeric"
          placeholder={PLACEHOLDER}
          defaultValue={money(saved?.monthlySpending)}
        />
        <TextField
          name="companyName"
          label="Company Name"
          placeholder={PLACEHOLDER}
          defaultValue={saved?.company.name}
          error={errors.fields["company.name"]}
        />
        <TextField
          name="companyPhoneNumber"
          label="Company Phone Number"
          inputMode="tel"
          placeholder={PLACEHOLDER}
          defaultValue={saved?.company.phoneNumber}
          error={errors.fields["company.phoneNumber"]}
        />
        <TextField
          name="companyAddress"
          label="Company Address"
          placeholder={PLACEHOLDER}
          defaultValue={saved?.company.address}
          error={errors.fields["company.address"]}
        />
      </FieldGroup>
      <FieldGroup title="Spouse ID Address">
        <AddressFields value={idAddress} onChange={setIdAddress} errorPrefix="idAddress" errors={errors.fields} />
      </FieldGroup>
      <StepActions onBack={onBack} onSaveDraft={saveDraft} submitting={submitting} last={last} />
    </form>
  );
}
