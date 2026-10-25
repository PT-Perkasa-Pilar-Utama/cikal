import type { DukcapilMatchStatus, DukcapilOutcome } from "@cikal/contracts";
import { Decimal } from "decimal.js";

const SCORE_DECIMALS = 4;
const WEIGHT_TOTAL = 100;

/** DukcapilRule aktif tenant (technical-specs 06 §6.11 M07); angka berupa string desimal dari kolom `numeric`. */
export interface DukcapilRule {
  nameWeight: string;
  motherNameWeight: string;
  passedThreshold: string;
  reviewThreshold: string;
  notFoundOutcome: "REVIEW" | "FAILED";
}

/** Jawaban kanonik DukcapilPort yang dinilai aturan. */
export interface DukcapilAnswer {
  recordFound: boolean;
  dobMatch: boolean;
  pobMatch: boolean;
  fullNameScore: string;
  motherNameScore: string;
}

export interface DukcapilVerdict {
  outcome: Exclude<DukcapilOutcome, "SKIP">;
  dobStatus: DukcapilMatchStatus | null;
  pobStatus: DukcapilMatchStatus | null;
  finalScore: string | null;
}

const status = (match: boolean): DukcapilMatchStatus => (match ? "MATCH" : "NOT_MATCH");

/** Skor berbobot nama dan nama ibu, contoh 0,90 x 60% + 0,85 x 40% = 0,88 (TRM_DKC_003). */
export function weightedScore(rule: DukcapilRule, fullNameScore: string, motherNameScore: string): string {
  return new Decimal(fullNameScore)
    .mul(rule.nameWeight)
    .add(new Decimal(motherNameScore).mul(rule.motherNameWeight))
    .div(WEIGHT_TOTAL)
    .toFixed(SCORE_DECIMALS, Decimal.ROUND_HALF_UP);
}

/**
 * Keputusan langkah DUKCAPIL (api-specs 20 §20.1, TRM_DKC_001 s.d. 007). NIK tidak ditemukan memakai
 * `notFoundOutcome`; tanggal atau tempat lahir beda langsung `FAILED` tanpa skor; selain itu ambang Passed dan Review
 * inklusif.
 */
export function judgeDukcapil(rule: DukcapilRule, answer: DukcapilAnswer): DukcapilVerdict {
  if (!answer.recordFound) return { outcome: rule.notFoundOutcome, dobStatus: null, pobStatus: null, finalScore: null };
  const dobStatus = status(answer.dobMatch);
  const pobStatus = status(answer.pobMatch);
  if (!answer.dobMatch || !answer.pobMatch) return { outcome: "FAILED", dobStatus, pobStatus, finalScore: null };
  const finalScore = weightedScore(rule, answer.fullNameScore, answer.motherNameScore);
  const outcome = new Decimal(finalScore).gte(rule.passedThreshold)
    ? "PASSED"
    : new Decimal(finalScore).gte(rule.reviewThreshold)
      ? "REVIEW"
      : "FAILED";
  return { outcome, dobStatus, pobStatus, finalScore };
}
