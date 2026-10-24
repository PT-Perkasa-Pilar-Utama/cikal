import type { OccupationSectionInput } from "@cikal/contracts";
import { type FormEvent, useRef, useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TextField } from "../../components/ui/TextField";
import { formatMoney, isMoneyValue } from "../../lib/format";
import { AddressFields } from "./AddressFields";
import { addressValues } from "./address-values";
import { FieldGroup, ParameterSelect } from "./FieldGroup";
import { readOccupationStep } from "./occupation-step-values";
import { type SectionProps, StepActions } from "./StepActions";

interface OccupationSectionProps extends SectionProps<OccupationSectionInput> {
  /** Produk kategori Pension tidak mewajibkan penghasilan dan lama kerja (AC-44.03). */
  pension: boolean;
}

const PLACEHOLDER = "Type here";

/**
 * Step "Occupation" (api-specs 12 §12.3): pekerjaan, penghasilan, dan data perusahaan. Penghasilan 0 dan aturan KUR
 * hanya untuk wiraswasta diperiksa API dan pesannya tampil di bawah field (AC-44.02, AC-44.04).
 */
export function OccupationSection({
  saved,
  pension,
  onNext,
  onSaveDraft,
  onBack,
  submitting,
  errors,
  last,
}: OccupationSectionProps) {
  const form = useRef<HTMLFormElement>(null);
  const [companyAddress, setCompanyAddress] = useState(() => addressValues(saved?.company));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(readOccupationStep(event.currentTarget, companyAddress));
  }

  function saveDraft() {
    if (form.current) onSaveDraft(readOccupationStep(form.current, companyAddress));
  }

  const error = (name: string) => errors.fields[name];
  const text = (name: keyof OccupationSectionInput, label: string) => {
    const value = saved?.[name];
    return { name, label, defaultValue: typeof value === "string" ? value : undefined, error: error(name) };
  };
  const income = saved?.monthlyIncomeAllowance;

  return (
    <form ref={form} aria-label="Occupation" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.message && <FeedbackMessage type="error">{errors.message}</FeedbackMessage>}
      <FieldGroup title="Occupation Info">
        <ParameterSelect {...text("sourceOfIncome", "Source of Income")} required paramType="Source of Income" />
        <ParameterSelect {...text("occupation", "Occupation")} required paramType="Occupation" />
        <ParameterSelect
          {...text("industryOfProfession", "Industry of Profession")}
          required
          paramType="Industry of Profession"
        />
        <TextField {...text("position", "Position")} placeholder={PLACEHOLDER} />
        <TextField
          {...text("tenureAtCurrentJob", "Tenure at Current Job (Years)")}
          required={!pension}
          inputMode="decimal"
          placeholder={PLACEHOLDER}
        />
        <TextField
          {...text("monthlyIncomeAllowance", "Monthly Income Allowance")}
          required={!pension}
          inputMode="numeric"
          placeholder={PLACEHOLDER}
          defaultValue={income && isMoneyValue(income) ? formatMoney(income) : income}
        />
        <TextField {...text("organization", "Organization")} placeholder={PLACEHOLDER} />
        <TextField {...text("previousEmployer", "Previous Employer")} placeholder={PLACEHOLDER} />
        <ParameterSelect {...text("pensionInstance", "Pension Instance")} paramType="Pension Instance" />
      </FieldGroup>
      <FieldGroup title="Company Info">
        <TextField
          name="companyName"
          label="Company Name"
          required
          placeholder={PLACEHOLDER}
          defaultValue={saved?.company.name}
          error={error("company.name")}
        />
        <TextField
          name="companyPhoneNumber"
          label="Company Phone Number"
          required
          inputMode="tel"
          placeholder={PLACEHOLDER}
          defaultValue={saved?.company.phoneNumber}
          error={error("company.phoneNumber")}
        />
        <AddressFields
          value={companyAddress}
          onChange={setCompanyAddress}
          errorPrefix="company"
          errors={errors.fields}
          addressLabel="Company Address"
          withRtRw={false}
        />
      </FieldGroup>
      <StepActions onBack={onBack} onSaveDraft={saveDraft} submitting={submitting} last={last} />
    </form>
  );
}
