import type { FormulaVariable, ParamType } from "@cikal/contracts";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { useParameterOptions } from "../application-entry/api";
import type { CriterionValues } from "./criterion-values";

interface ValueFieldsProps {
  variable: FormulaVariable;
  variables: FormulaVariable[];
  values: CriterionValues;
  onChange: (patch: Partial<CriterionValues>) => void;
}

const SOURCE_OPTIONS = [
  { value: "LITERAL", label: "Value" },
  { value: "VARIABLE", label: "Field" },
];

/** Pilihan General Parameter aktif untuk variabel CHOICE, contoh Occupation "ASN" dan "Karyawan BUMN" (AC-37.01). */
function ChoiceValues({
  paramType,
  values,
  onChange,
}: { paramType: ParamType } & Omit<ValueFieldsProps, "variable" | "variables">) {
  const options = (useParameterOptions(paramType).data ?? []).filter((option) => option.isActive);
  if (values.operator !== "IN") {
    return (
      <SelectField
        label="Value"
        required
        options={options.map((option) => ({ value: option.paramId, label: option.paramValue }))}
        value={values.value}
        onChange={(event) => onChange({ value: event.target.value })}
      />
    );
  }
  const toggle = (paramId: string, checked: boolean) =>
    onChange({ values: checked ? [...values.values, paramId] : values.values.filter((id) => id !== paramId) });
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="font-semibold text-neutral-7">Value</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((option) => (
          <label key={option.paramId} className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.values.includes(option.paramId)}
              onChange={(event) => toggle(option.paramId, event.target.checked)}
              className="size-4 accent-primary"
            />
            {option.paramValue}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Nilai kriteria (api-specs 22 §22.3): nilai literal, daftar untuk "is one of", rentang untuk "between", atau field
 * lain bertipe sama sebagai pembanding, contoh "Product DBR Max" (AC-37.02).
 */
export function CriterionValueFields({ variable, variables, values, onChange }: ValueFieldsProps) {
  const comparable = variables.filter(
    (candidate) => candidate.dataType === variable.dataType && candidate.variableCode !== variable.variableCode,
  );
  return (
    <>
      {values.operator !== "IN" && values.operator !== "BETWEEN" && comparable.length > 0 && (
        <SelectField
          label="Compare With"
          options={SOURCE_OPTIONS}
          value={values.valueSource}
          onChange={(event) => onChange({ valueSource: event.target.value === "VARIABLE" ? "VARIABLE" : "LITERAL" })}
        />
      )}
      {values.valueSource === "VARIABLE" ? (
        <SelectField
          label="Value"
          required
          options={comparable.map((candidate) => ({ value: candidate.variableCode, label: candidate.label }))}
          value={values.variableCode}
          onChange={(event) => onChange({ variableCode: event.target.value })}
        />
      ) : variable.paramType ? (
        <ChoiceValues paramType={variable.paramType} values={values} onChange={onChange} />
      ) : values.operator === "BETWEEN" ? (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="From"
            required
            value={values.from}
            onChange={(event) => onChange({ from: event.target.value })}
          />
          <TextField label="To" required value={values.to} onChange={(event) => onChange({ to: event.target.value })} />
        </div>
      ) : (
        <TextField
          label="Value"
          required
          value={values.value}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      )}
    </>
  );
}
