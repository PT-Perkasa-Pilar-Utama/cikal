import {
  criterionOperatorSchema,
  criterionTypeSchema,
  type FormulaVariable,
  type ScoringCriterion,
} from "@cikal/contracts";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { useSaveCriterion } from "./api";
import { CriterionValueFields } from "./CriterionValueFields";
import { type CriterionValues, criterionInput, criterionValues, EMPTY_CRITERION } from "./criterion-values";
import { CRITERION_TYPE_LABELS, operatorOptions } from "./labels";

const TYPE_OPTIONS = Object.entries(CRITERION_TYPE_LABELS).map(([value, label]) => ({ value, label }));

interface CriterionFormProps {
  modelId: string;
  /** Kriteria yang diubah; kosong untuk "Add Criterion". */
  criterion?: ScoringCriterion;
  variables: FormulaVariable[];
  onClose: () => void;
}

/**
 * Form "Add Criterion" dari katalog variabel scoring (api-specs 22 §22.3). Tipe nilai dan rentang bobot diperiksa
 * server, jadi pesannya tampil apa adanya (AC-37.03, AC-37.04).
 */
export function CriterionForm({ modelId, criterion, variables, onClose }: CriterionFormProps) {
  const [values, setValues] = useState<CriterionValues>(() =>
    criterion ? criterionValues(criterion) : EMPTY_CRITERION,
  );
  const save = useSaveCriterion(modelId, criterion?.id);
  const variable = variables.find((candidate) => candidate.variableCode === values.fieldCode);
  const patch = (next: Partial<CriterionValues>) => setValues((current) => ({ ...current, ...next }));

  function submit() {
    if (!variable) return;
    save.mutate(criterionInput(values, variable.paramType !== null), { onSuccess: onClose });
  }

  return (
    <Popup title={criterion ? "Edit Criterion" : "Add Criterion"} size="sm" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {save.error && <FeedbackMessage type="error">{save.error.message}</FeedbackMessage>}
        <SelectField
          label="Field"
          required
          options={variables.map((candidate) => ({ value: candidate.variableCode, label: candidate.label }))}
          value={values.fieldCode}
          onChange={(event) => setValues({ ...EMPTY_CRITERION, fieldCode: event.target.value })}
        />
        {variable && (
          <>
            <SelectField
              label="Operator"
              required
              options={operatorOptions(variable)}
              value={values.operator}
              onChange={(event) =>
                patch({
                  operator: criterionOperatorSchema.parse(event.target.value),
                  valueSource: "LITERAL",
                  values: [],
                })
              }
            />
            <CriterionValueFields variable={variable} variables={variables} values={values} onChange={patch} />
          </>
        )}
        <SelectField
          label="Criterion Type"
          required
          options={TYPE_OPTIONS}
          value={values.criterionType}
          onChange={(event) => patch({ criterionType: criterionTypeSchema.parse(event.target.value) })}
        />
        {values.criterionType === "WEIGHTED" && (
          <TextField
            label="Weight"
            required
            inputMode="decimal"
            value={values.weight}
            onChange={(event) => patch({ weight: event.target.value })}
          />
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!variable || save.isPending} onClick={submit}>
            Save
          </Button>
        </div>
      </div>
    </Popup>
  );
}
