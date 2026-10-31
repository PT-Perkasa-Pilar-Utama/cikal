import type { CollateralSectionInput, CollateralType } from "@cikal/contracts";
import { collateralTypeSchema } from "@cikal/contracts";
import { type FormEvent, useRef, useState } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { formatMoney, isMoneyValue } from "../../lib/format";
import { AddressFields } from "./AddressFields";
import { addressValues } from "./address-values";
import { useCollateralTypes } from "./api";
import { readCollateralStep } from "./conditional-step-values";
import { FieldGroup, ParameterSelect } from "./FieldGroup";
import { COLLATERAL_TYPE_LABELS } from "./labels";
import { type SectionProps, StepActions } from "./StepActions";

interface CollateralSectionProps extends SectionProps<CollateralSectionInput> {
  applicationId: string;
}

const PLACEHOLDER = "Type here";

/**
 * Step "Collateral" (api-specs 12 §12.3, US-46): pilihan "Collateral Type" hanya jenis yang boleh untuk produk, dan
 * satu jenis saja langsung terpilih (KPR "Sertifikat", AC-46.02). Field mengikuti jenis agunan: kendaraan
 * (AC-46.01), sertifikat, atau SK pensiun (AC-46.03).
 */
export function CollateralSection({
  applicationId,
  saved,
  onNext,
  onSaveDraft,
  onBack,
  submitting,
  errors,
  last,
}: CollateralSectionProps) {
  const form = useRef<HTMLFormElement>(null);
  const { data: types = [] } = useCollateralTypes(applicationId);
  const [chosen, setChosen] = useState<CollateralType | undefined>(saved?.collateralType);
  const [address, setAddress] = useState(() => addressValues(saved?.address));
  const only = types.length === 1 ? types[0] : undefined;
  const type = only ?? chosen;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(readCollateralStep(event.currentTarget, address));
  }

  function saveDraft() {
    if (form.current) onSaveDraft(readCollateralStep(form.current, address));
  }

  const field = (name: keyof CollateralSectionInput, label: string) => {
    const value = saved?.[name];
    return {
      name,
      label,
      defaultValue: typeof value === "string" || typeof value === "number" ? String(value) : undefined,
      error: errors.fields[name],
    };
  };
  const price = saved?.vehiclePrice;
  const addressGroup = (title: string) => (
    <FieldGroup title={title}>
      <AddressFields value={address} onChange={setAddress} errorPrefix="address" errors={errors.fields} />
    </FieldGroup>
  );

  return (
    <form ref={form} aria-label="Collateral" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.message && <FeedbackMessage type="error">{errors.message}</FeedbackMessage>}
      <FieldGroup title="Collateral Info">
        <SelectField
          name="collateralType"
          label="Collateral Type"
          required
          options={types.map((value) => ({ value, label: COLLATERAL_TYPE_LABELS[value] }))}
          value={type ?? ""}
          onChange={(event) => setChosen(collateralTypeSchema.safeParse(event.target.value).data)}
          error={errors.fields.collateralType}
        />
      </FieldGroup>
      {type === "VEHICLE" && (
        <>
          <FieldGroup title="Vehicle Details">
            <ParameterSelect {...field("vehicleType", "Type")} required paramType="Object Type" />
            <TextField {...field("vehicleBrand", "Brand")} required placeholder={PLACEHOLDER} />
            <TextField {...field("vehicleModel", "Model")} required placeholder={PLACEHOLDER} />
            <TextField
              {...field("vehicleYear", "Year of Vehicle Release")}
              required
              inputMode="numeric"
              placeholder={PLACEHOLDER}
            />
            <TextField
              {...field("vehiclePrice", "Price")}
              required
              inputMode="numeric"
              placeholder={PLACEHOLDER}
              defaultValue={price && isMoneyValue(price) ? formatMoney(price) : price}
            />
            <TextField {...field("vehicleColor", "Color")} required placeholder={PLACEHOLDER} />
            <TextField {...field("machineNumber", "Machine Number")} required placeholder={PLACEHOLDER} />
            <TextField {...field("frameNumber", "Frame Number")} required placeholder={PLACEHOLDER} />
            <TextField {...field("bpkbNumber", "BPKB Number")} required placeholder={PLACEHOLDER} />
            <TextField {...field("policeNumber", "Police Number")} required placeholder={PLACEHOLDER} />
          </FieldGroup>
          {addressGroup("Vehicle Address")}
        </>
      )}
      {type === "CERTIFICATE" && (
        <>
          <FieldGroup title="Certificate Details">
            <ParameterSelect {...field("certificateType", "Certificate Type")} required paramType="Certificate Type" />
            <TextField {...field("certificateNumber", "Certificate Number")} required placeholder={PLACEHOLDER} />
            <TextField
              {...field("surfaceArea", "Surface Area (m²)")}
              required
              inputMode="decimal"
              placeholder={PLACEHOLDER}
            />
          </FieldGroup>
          {addressGroup("Certificate Address")}
        </>
      )}
      {type === "PENSION_DECREE" && (
        <FieldGroup title="Pension Decree">
          <TextField {...field("decreeNumber", "Decree Number")} required placeholder={PLACEHOLDER} />
          <TextField {...field("decreeDate", "Decree Date")} required type="date" />
        </FieldGroup>
      )}
      <StepActions onBack={onBack} onSaveDraft={saveDraft} submitting={submitting} last={last} />
    </form>
  );
}
