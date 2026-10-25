import type { RacOutcome, ScoringOutcome } from "@cikal/contracts";
import { Decimal } from "decimal.js";
import type { CriterionEvaluation } from "./criteria.js";

const SCORE_DECIMALS = 2;

/** RAC (api-specs 22 §22.5): `FAIL` bila satu kriteria `MANDATORY` tidak terpenuhi (AC-67.02, AC-67.03). */
export function racOutcome(evaluations: readonly CriterionEvaluation[]): {
  result: RacOutcome;
  failedReasons: string[];
} {
  const failedReasons = evaluations.flatMap((evaluation) => (evaluation.failedReason ? [evaluation.failedReason] : []));
  return { result: failedReasons.length === 0 ? "PASS" : "FAIL", failedReasons };
}

/**
 * Scoring (api-specs 22 §22.5): `totalScore = constant + jumlah bobot kriteria terpenuhi`. Skor >= Cut Off = `PASS`;
 * di antara `reviewLowerBound` dan Cut Off = `REVIEW`; selain itu `FAIL` (AC-67.01).
 */
export function scoringOutcome(
  model: { constant: string; cutOff: string; reviewLowerBound: string | null },
  evaluations: readonly CriterionEvaluation[],
): { totalScore: string; result: ScoringOutcome } {
  const total = evaluations.reduce(
    (sum, evaluation) => sum.add(evaluation.appliedWeight ?? 0),
    new Decimal(model.constant),
  );
  const result = total.gte(model.cutOff)
    ? "PASS"
    : model.reviewLowerBound !== null && total.gte(model.reviewLowerBound)
      ? "REVIEW"
      : "FAIL";
  return { totalScore: total.toFixed(SCORE_DECIMALS), result };
}
