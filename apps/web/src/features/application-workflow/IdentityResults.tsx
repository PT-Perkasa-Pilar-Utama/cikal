import { formatDateTime, formatDecimal } from "../../lib/format";
import { useDedupResult, useDukcapilResult } from "./api";
import { APPLICATION_STATUS_LABELS, EMPTY_VALUE, MATCH_LABELS, outcomeLabel, yesNo } from "./labels";
import { ResultFields, ResultState, ResultTable } from "./ResultLayout";
import type { StepResultProps } from "./step-result-props";

const orDash = (value: string | null): string => (value === null ? EMPTY_VALUE : formatDecimal(value));
const matchLabel = (value: string | null): string => (value === null ? EMPTY_VALUE : (MATCH_LABELS[value] ?? value));

/** Klik langkah "Dedup": hasil, baris Dedup Matrix, dan kandidat yang dibandingkan (api-specs 19 §19.2). */
export function DedupResult({ applicationId, processInstanceId }: StepResultProps) {
  const { data, error } = useDedupResult(applicationId, processInstanceId);
  return (
    <ResultState data={data?.data} error={error}>
      {(dedup) => (
        <>
          <ResultFields
            fields={[
              ["Result", outcomeLabel(dedup.outcome)],
              ["Checked At", formatDateTime(dedup.ranAt)],
              ["Matched Application", dedup.matchedApplication?.loanId ?? EMPTY_VALUE],
              ["Matrix Row", dedup.matrixRow ? `Priority ${dedup.matrixRow.priority}` : EMPTY_VALUE],
            ]}
          />
          <ResultTable
            caption="Candidates"
            headers={["Loan ID", "Status", "NIK", "Date of Birth", "Place of Birth", "Name Score", "Mother Name Score"]}
            rows={dedup.candidates.map((candidate) => [
              candidate.loanId,
              APPLICATION_STATUS_LABELS[candidate.status],
              matchLabel(candidate.nikResult),
              matchLabel(candidate.dobResult),
              matchLabel(candidate.pobResult),
              formatDecimal(candidate.nameScore),
              formatDecimal(candidate.motherNameScore),
            ])}
          />
        </>
      )}
    </ResultState>
  );
}

/** Klik langkah "Dukcapil": banding data kependudukan, skor berbobot, dan ambangnya (api-specs 20 §20.2). */
export function DukcapilResult({ applicationId, processInstanceId }: StepResultProps) {
  const { data, error } = useDukcapilResult(applicationId, processInstanceId);
  return (
    <ResultState data={data?.data} error={error}>
      {(dukcapil) => (
        <ResultFields
          fields={[
            ["Result", outcomeLabel(dukcapil.outcome)],
            ["Record Found", yesNo(dukcapil.recordFound)],
            ["Date of Birth", matchLabel(dukcapil.dobStatus)],
            ["Place of Birth", matchLabel(dukcapil.pobStatus)],
            ["Full Name Score", orDash(dukcapil.fullNameScore)],
            ["Mother Name Score", orDash(dukcapil.motherNameScore)],
            ["Final Score", orDash(dukcapil.finalScore)],
            ["Passed Threshold", formatDecimal(dukcapil.rule.passedThreshold)],
            ["Review Threshold", formatDecimal(dukcapil.rule.reviewThreshold)],
            ["Provider", dukcapil.providerCode ?? EMPTY_VALUE],
          ]}
        />
      )}
    </ResultState>
  );
}
