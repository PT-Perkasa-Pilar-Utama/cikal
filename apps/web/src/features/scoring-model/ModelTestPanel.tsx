import type { ScoringModelTest } from "@cikal/contracts";
import { Play } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../lib/api/client";
import { formatDecimal } from "../../lib/format";
import { EMPTY_VALUE, outcomeLabel, yesNo } from "../application-workflow/labels";
import { ResultFields, ResultTable } from "../application-workflow/ResultLayout";
import { useTestModel } from "./api";

/** `VALIDATION_FAILED` membawa penyebabnya di `details`, contoh Cut Off kosong (api-specs 22 §22.5). */
function errorMessages(error: Error): string[] {
  if (error instanceof ApiError && error.envelope.details.length > 0)
    return error.envelope.details.map((detail) => detail.message);
  return [error.message];
}

const score = (value: string | null): string => (value ? formatDecimal(value) : EMPTY_VALUE);

/** RAC tidak punya konstanta, Cut Off, dan skor, jadi hanya hasil dan kriterianya yang tampil. */
function TestResult({ result }: { result: ScoringModelTest }) {
  const scoring = result.modelGroup === "SCORING";
  const scoreFields: [string, string][] = scoring
    ? [
        ["Total Score", score(result.totalScore)],
        ["Constant", score(result.constant)],
        ["Cut Off", score(result.cutOff)],
      ]
    : [];
  return (
    <div className="flex flex-col gap-4">
      <ResultFields fields={[...scoreFields, ["Result", outcomeLabel(result.result)]]} />
      <ResultTable
        caption="Criteria"
        headers={scoring ? ["Criteria", "Actual Value", "Score", "Met"] : ["Criteria", "Actual Value", "Met"]}
        rows={result.criteria.map((criterion) => [
          criterion.displayText,
          criterion.actualValue ?? EMPTY_VALUE,
          ...(scoring ? [score(criterion.appliedWeight)] : []),
          yesNo(criterion.isMet),
        ])}
      />
    </div>
  );
}

/** Form "Run Test" dengan Loan ID pengajuan contoh di field "Sample Application" (AC-38.01 s.d. AC-38.04). */
export function ModelTestPanel({ modelId }: { modelId: string }) {
  const [sampleLoanId, setSampleLoanId] = useState("");
  const test = useTestModel(modelId);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    test.mutate({ sampleLoanId: sampleLoanId.trim() });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-s">
      <form className="flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
        <div className="min-w-64 flex-1">
          <TextField
            label="Sample Application"
            required
            value={sampleLoanId}
            onChange={(event) => setSampleLoanId(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={!sampleLoanId.trim() || test.isPending}>
          <Play size={16} aria-hidden />
          Run Test
        </Button>
      </form>
      {test.error &&
        errorMessages(test.error).map((message) => (
          <FeedbackMessage key={message} type="error">
            {message}
          </FeedbackMessage>
        ))}
      {test.data && !test.error && <TestResult result={test.data.data} />}
    </div>
  );
}
