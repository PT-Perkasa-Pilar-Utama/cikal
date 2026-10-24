import { INSTALLMENT_SIMULATION_MESSAGES, type InstallmentSimulationRequest } from "@cikal/contracts";
import { Calculator } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { parseMoneyInput, parsePercentInput } from "../../lib/format";

/** Jenis bunga yang bisa dihitung di POC; Floating, Hybrid, dan Capped [Deferred] (AC-51.02). */
const INTEREST_TYPES = [
  { value: "FLAT", label: "Flat" },
  { value: "EFFECTIVE", label: "Effective" },
] as const;
type InterestType = (typeof INTEREST_TYPES)[number]["value"];

const RATE_INVALID = "Interest rate must be a number with up to 4 decimals";
const WHOLE_NUMBER = /^\d+$/;

type Field = "principal" | "tenor" | "interestRate" | "interestType";
export type FieldErrors = Partial<Record<Field, string>>;

const isInterestType = (value: string): value is InterestType => INTEREST_TYPES.some((type) => type.value === value);

interface Values {
  principal: string;
  tenor: string;
  interestRate: string;
  interestType: string;
}

/** Validasi di layar dengan pesan yang sama dengan kontrak; tenor kosong "Tenor is required" (AC-51.03). */
function toRequest(values: Values): { request?: InstallmentSimulationRequest; errors: FieldErrors } {
  const { required, tenorRequired, tenorInvalid, principalInvalid } = INSTALLMENT_SIMULATION_MESSAGES;
  const errors: FieldErrors = {};
  const principal = parseMoneyInput(values.principal);
  if (!values.principal.trim()) errors.principal = required;
  else if (!principal || /^0+\.00$/.test(principal)) errors.principal = principalInvalid;
  const tenorText = values.tenor.trim();
  if (!tenorText) errors.tenor = tenorRequired;
  else if (!WHOLE_NUMBER.test(tenorText) || Number(tenorText) < 1) errors.tenor = tenorInvalid;
  const interestRate = parsePercentInput(values.interestRate);
  if (!values.interestRate.trim()) errors.interestRate = required;
  else if (!interestRate) errors.interestRate = RATE_INVALID;
  if (!isInterestType(values.interestType)) errors.interestType = required;
  if (Object.keys(errors).length > 0 || !principal || !interestRate || !isInterestType(values.interestType)) {
    return { errors };
  }
  return {
    request: { interestType: values.interestType, principal, tenor: Number(tenorText), interestRate },
    errors,
  };
}

interface SimulationFormProps {
  onCalculate: (request: InstallmentSimulationRequest) => void;
  calculating: boolean;
  /** Error per field dari server (`details` envelope VALIDATION_FAILED). */
  serverErrors: FieldErrors;
}

/** Form "Installment Simulation" (api-specs 09 §9.1, US-51). */
export function SimulationForm({ onCalculate, calculating, serverErrors }: SimulationFormProps) {
  const [values, setValues] = useState<Values>({ principal: "", tenor: "", interestRate: "", interestType: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const shown = { ...serverErrors, ...errors };
  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = toRequest(values);
    setErrors(result.errors);
    if (result.request) onCalculate(result.request);
  };

  return (
    <form aria-label="Installment Simulation" noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Principal"
          required
          inputMode="numeric"
          placeholder="100.000.000"
          value={values.principal}
          onChange={set("principal")}
          error={shown.principal}
        />
        <TextField
          label="Tenor (months)"
          required
          inputMode="numeric"
          value={values.tenor}
          onChange={set("tenor")}
          error={shown.tenor}
        />
        <TextField
          label="Interest Rate (% p.a.)"
          required
          inputMode="decimal"
          value={values.interestRate}
          onChange={set("interestRate")}
          error={shown.interestRate}
        />
        <SelectField
          label="Interest Type"
          required
          options={INTEREST_TYPES}
          value={values.interestType}
          onChange={set("interestType")}
          error={shown.interestType}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={calculating}>
          <Calculator size={20} aria-hidden />
          Calculate
        </Button>
      </div>
    </form>
  );
}
