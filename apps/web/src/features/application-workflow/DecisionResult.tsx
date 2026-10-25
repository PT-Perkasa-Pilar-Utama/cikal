import { type DecisionOutcomes, stepNames } from "@cikal/contracts";
import { useDecisionResult } from "./api";
import { DECISION_OUTCOME_LABELS, EMPTY_VALUE, outcomeLabel } from "./labels";
import { ResultFields, ResultState, ResultTable } from "./ResultLayout";
import type { StepResultProps } from "./step-result-props";

const OUTCOME_KEYS = [
  "dedup",
  "dukcapil",
  "fraud",
  "rac",
  "scoring",
  "creditBureau",
] as const satisfies readonly (keyof DecisionOutcomes)[];

/**
 * Klik langkah "Decision": Go atau NotGo, baris Decision Matrix yang dipakai, langkah berikutnya untuk Go
 * (AC-69.01), dan hasil keenam modul dengan modul yang dilewati bernilai Skip (AC-69.03).
 */
export function DecisionResult({ applicationId, processInstanceId }: StepResultProps) {
  const { data, error } = useDecisionResult(applicationId, processInstanceId);
  return (
    <ResultState data={data?.data} error={error}>
      {(decision) => (
        <>
          <ResultFields
            fields={[
              ["Decision", outcomeLabel(decision.decisionOutcome)],
              ["Matrix Row", decision.matchedRow ? `Priority ${decision.matchedRow.priority}` : EMPTY_VALUE],
              ["Next Step", decision.nextStep ? stepNames[decision.nextStep] : EMPTY_VALUE],
              ["Description", decision.description ?? EMPTY_VALUE],
            ]}
          />
          <ResultTable
            caption="Module Outcomes"
            headers={["Module", "Outcome"]}
            rows={OUTCOME_KEYS.map((key) => [DECISION_OUTCOME_LABELS[key], outcomeLabel(decision.outcomes[key])])}
          />
        </>
      )}
    </ResultState>
  );
}
