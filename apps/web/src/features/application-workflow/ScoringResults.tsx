import { formatDecimal } from "../../lib/format";
import { useScoringResult } from "./api";
import { EMPTY_VALUE, outcomeLabel, yesNo } from "./labels";
import { ResultFields, ResultState, ResultTable } from "./ResultLayout";
import type { StepResultProps } from "./step-result-props";

/** Klik langkah "RAC": hasil Pass atau Fail beserta alasan kriteria wajib yang gagal (api-specs 22 §22.6, AC-67.02). */
export function RacResult({ applicationId, processInstanceId }: StepResultProps) {
  const { data, error } = useScoringResult(applicationId, processInstanceId);
  return (
    <ResultState data={data?.data.rac} error={error}>
      {(rac) => (
        <>
          <ResultFields
            fields={[
              ["Result", outcomeLabel(rac.result)],
              ["Model", `${rac.modelCode} v${rac.versionNumber}`],
            ]}
          />
          {rac.failedReasons.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="font-semibold text-neutral-7">Reasons</p>
              <ul className="list-disc pl-5">
                {rac.failedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          <ResultTable
            caption="Criteria"
            headers={["Criteria", "Actual Value", "Met"]}
            rows={rac.criteria.map((criterion) => [
              criterion.displayText,
              criterion.actualValue ?? EMPTY_VALUE,
              yesNo(criterion.isMet),
            ])}
          />
        </>
      )}
    </ResultState>
  );
}

/** Klik langkah "Scoring": Total Score, Cut Off, hasil, dan kriteria yang terpenuhi (api-specs 22 §22.6, AC-67.01). */
export function ScoringResult({ applicationId, processInstanceId }: StepResultProps) {
  const { data, error } = useScoringResult(applicationId, processInstanceId);
  return (
    <ResultState data={data?.data.scoring} error={error}>
      {(scoring) => (
        <>
          <ResultFields
            fields={[
              ["Total Score", formatDecimal(scoring.totalScore)],
              ["Cut Off", formatDecimal(scoring.cutOff)],
              ["Result", outcomeLabel(scoring.result)],
              ["Constant", formatDecimal(scoring.constant)],
              ["Model", `${scoring.modelCode} v${scoring.versionNumber}`],
            ]}
          />
          <ResultTable
            caption="Criteria"
            headers={["Criteria", "Actual Value", "Score", "Met"]}
            rows={scoring.criteria.map((criterion) => [
              criterion.displayText,
              criterion.actualValue ?? EMPTY_VALUE,
              criterion.appliedWeight ? formatDecimal(criterion.appliedWeight) : EMPTY_VALUE,
              yesNo(criterion.isMet),
            ])}
          />
        </>
      )}
    </ResultState>
  );
}
