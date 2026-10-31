import type { BusinessSectionInput } from "@cikal/contracts";
import { type FormEvent, useRef, useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TextField } from "../../components/ui/TextField";
import { formatMoney, isMoneyValue } from "../../lib/format";
import { AddressFields } from "./AddressFields";
import { addressValues } from "./address-values";
import { readBusinessStep } from "./conditional-step-values";
import { FieldGroup, ParameterSelect } from "./FieldGroup";
import { type SectionProps, StepActions } from "./StepActions";

const PLACEHOLDER = "Type here";

/**
 * Step "Business" untuk pemohon wiraswasta (api-specs 12 §12.3, US-45). Tanggal mulai usaha di masa depan dan lama
 * usaha di bawah batas produk ditolak API dan pesannya tampil di bawah field (AC-45.02, AC-45.04).
 */
export function BusinessSection({
  saved,
  onNext,
  onSaveDraft,
  onBack,
  submitting,
  errors,
  last,
}: SectionProps<BusinessSectionInput>) {
  const form = useRef<HTMLFormElement>(null);
  const [address, setAddress] = useState(() => addressValues(saved?.address));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(readBusinessStep(event.currentTarget, address));
  }

  function saveDraft() {
    if (form.current) onSaveDraft(readBusinessStep(form.current, address));
  }

  const field = (name: keyof BusinessSectionInput, label: string) => {
    const value = saved?.[name];
    return { name, label, defaultValue: typeof value === "string" ? value : undefined, error: errors.fields[name] };
  };
  const sales = saved?.annualSales;

  return (
    <form ref={form} aria-label="Business" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.message && <FeedbackMessage type="error">{errors.message}</FeedbackMessage>}
      <FieldGroup title="Business Info">
        <TextField {...field("businessName", "Business Name")} required placeholder={PLACEHOLDER} />
        <ParameterSelect {...field("businessField", "Business Field")} required paramType="Business Field" />
        <TextField
          {...field("annualSales", "Annual Sales")}
          required
          inputMode="numeric"
          placeholder={PLACEHOLDER}
          defaultValue={sales && isMoneyValue(sales) ? formatMoney(sales) : sales}
        />
        <TextField {...field("businessLaunchDate", "Business Launch Date")} required type="date" />
        <TextField {...field("businessNumber", "Business License Number")} placeholder={PLACEHOLDER} />
        <TextField {...field("phoneNumber", "Business Phone Number")} inputMode="tel" placeholder={PLACEHOLDER} />
        <TextField {...field("email", "Business Email")} type="email" placeholder={PLACEHOLDER} />
      </FieldGroup>
      <FieldGroup title="Business Address">
        <AddressFields
          value={address}
          onChange={setAddress}
          errorPrefix="address"
          errors={errors.fields}
          addressLabel="Business Address"
        />
      </FieldGroup>
      <StepActions onBack={onBack} onSaveDraft={saveDraft} submitting={submitting} last={last} />
    </form>
  );
}
