import { type ProductCategory, productCategorySchema } from "@cikal/contracts";
import { type FormEvent, useRef, useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { formatMoney, formatPercent, isMoneyValue } from "../../lib/format";
import { useAvailableProducts, useInsurances } from "./api";
import { type ApplicationStepValues, readApplicationStep } from "./application-step-values";
import { FieldGroup, ParameterSelect } from "./FieldGroup";
import { ORDER_LABELS, PRODUCT_CATEGORY_LABELS } from "./labels";
import { type SectionProps, StepActions } from "./StepActions";

interface ApplicationSectionProps extends SectionProps<ApplicationStepValues> {
  /** Setelah draft terbentuk, identitas pemohon diubah di step Personal. */
  identityLocked: boolean;
}

const CATEGORY_OPTIONS = Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const ID_TYPE_OPTIONS = [{ value: "KTP", label: "KTP" }];
const PLACEHOLDER = "Type here";
const ORDER_FIELDS = ["sourceCode", "salesCode", "referralCode", "marketingCode"] as const;

/**
 * Step "Application" (api-specs 12 §12.2, §12.3): Product hanya dari produk yang tersedia untuk kategori terpilih
 * (api-specs 08 §8.7) dan "Interest Rate" pricing yang berlaku hari ini tampil read-only (AC-97.04). Aturan plafon dan
 * tenor diperiksa API dan pesannya tampil di bawah field (AC-39.02, AC-39.03).
 */
export function ApplicationSection({
  saved,
  identityLocked,
  onNext,
  onSaveDraft,
  onBack,
  submitting,
  errors,
  last,
}: ApplicationSectionProps) {
  const form = useRef<HTMLFormElement>(null);
  const application = saved?.application;
  const [category, setCategory] = useState<ProductCategory | undefined>(application?.productCategory);
  const [productId, setProductId] = useState(application?.productId ?? "");
  const products = useAvailableProducts(category).data ?? [];
  const insurances = useInsurances().data ?? [];
  const product = products.find((option) => option.id === productId);
  const rate = product?.currentInterestRate;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(readApplicationStep(event.currentTarget));
  }

  function saveDraft() {
    if (form.current) onSaveDraft(readApplicationStep(form.current));
  }

  const error = (name: string) => errors.fields[name];
  const defaults = (name: keyof NonNullable<typeof application>) => {
    const value = application?.[name];
    return value === undefined ? undefined : String(value);
  };
  const limit = application?.requestedLimit;

  return (
    <form ref={form} aria-label="Application" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.message && <FeedbackMessage type="error">{errors.message}</FeedbackMessage>}
      <FieldGroup title="Application Info">
        <ParameterSelect
          name="applicationType"
          label="Application Type"
          paramType="Application Type"
          required
          defaultValue={defaults("applicationType")}
          error={error("applicationType")}
        />
        <ParameterSelect
          name="segment"
          label="Segment"
          paramType="Segment"
          required
          defaultValue={defaults("segment")}
          error={error("segment")}
        />
        <SelectField
          name="productCategory"
          label="Product Category"
          required
          options={CATEGORY_OPTIONS}
          value={category ?? ""}
          onChange={(event) => {
            setCategory(productCategorySchema.safeParse(event.target.value).data);
            setProductId("");
          }}
          error={error("productCategory")}
        />
        <SelectField
          name="productId"
          label="Product"
          required
          options={products.map((option) => ({ value: option.id, label: option.productCode }))}
          value={product ? productId : ""}
          onChange={(event) => setProductId(event.target.value)}
          error={error("productId")}
        />
        <ParameterSelect
          name="purposeOfLoan"
          label="Purpose of Loan"
          paramType="Purpose of Loan"
          defaultValue={defaults("purposeOfLoan")}
          error={error("purposeOfLoan")}
        />
        <TextField
          name="tenorProposed"
          label="Tenor Proposed"
          required
          inputMode="numeric"
          placeholder={PLACEHOLDER}
          defaultValue={defaults("tenorProposed")}
          error={error("tenorProposed")}
        />
        <TextField
          name="requestedLimit"
          label="Requested Limit"
          required
          inputMode="numeric"
          placeholder={PLACEHOLDER}
          defaultValue={limit && isMoneyValue(limit) ? formatMoney(limit) : limit}
          error={error("requestedLimit")}
        />
        <TextField label="Interest Rate" readOnly value={rate ? `${formatPercent(rate)}% p.a.` : ""} />
        <SelectField
          key={insurances.length}
          name="insuranceId"
          label="Insurance"
          options={insurances.map((option) => ({ value: option.id, label: option.insuranceName }))}
          defaultValue={defaults("insuranceId")}
          error={error("insuranceId")}
        />
      </FieldGroup>
      <FieldGroup title="Applicant Identity">
        <SelectField
          name="idType"
          label="ID Type"
          required
          options={ID_TYPE_OPTIONS}
          disabled={identityLocked}
          defaultValue={saved?.identity.idType ?? "KTP"}
          error={error("idType")}
        />
        <TextField
          name="idCardNumber"
          label="ID Card Number"
          required
          inputMode="numeric"
          placeholder={PLACEHOLDER}
          readOnly={identityLocked}
          defaultValue={saved?.identity.idCardNumber}
          error={error("idCardNumber")}
        />
        <TextField
          name="fullName"
          label="Full Name"
          required
          placeholder={PLACEHOLDER}
          readOnly={identityLocked}
          defaultValue={saved?.identity.fullName}
          error={error("fullName")}
        />
        <TextField
          name="fullNameId"
          label="Full Name ID"
          required
          placeholder={PLACEHOLDER}
          readOnly={identityLocked}
          defaultValue={saved?.identity.fullNameId}
          error={error("fullNameId")}
        />
      </FieldGroup>
      <FieldGroup title="Order Info">
        {ORDER_FIELDS.map((name) => (
          <TextField
            key={name}
            name={name}
            label={ORDER_LABELS[name]}
            placeholder={PLACEHOLDER}
            defaultValue={defaults(name)}
            error={error(name)}
          />
        ))}
      </FieldGroup>
      <StepActions onBack={onBack} onSaveDraft={saveDraft} submitting={submitting} last={last} />
    </form>
  );
}
