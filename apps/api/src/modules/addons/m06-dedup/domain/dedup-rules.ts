import type { DedupFieldResult, DedupOutcome } from "@cikal/contracts";
import type {
  CandidateComparison,
  DedupCandidateInput,
  DedupEvaluation,
  DedupSubject,
  FieldSettings,
  FuzzyCondition,
  MatrixCondition,
  MatrixRow,
  NameResult,
} from "./dedup-types.js";
import { nameScore } from "./name-similarity.js";

const IDENTICAL = "1.0000";
const PERCENT = 100;
/** Kandidat dengan status ini masih diproses, jadi NIK yang sama berarti pengajuan ganda (TRM_DDP_007). */
const IN_FLIGHT_STATUS = "ON_PROGRESS";
/** Urutan menang bila beberapa kandidat memberi hasil berbeda: Review didahulukan karena butuh mata manusia. */
const OUTCOME_PRECEDENCE = ["REVIEW", "MATCH", "SKIP", "UNMATCH"] as const;

const sameText = (left: string | null, right: string | null): DedupFieldResult =>
  left !== null && right !== null && left.trim().toUpperCase() === right.trim().toUpperCase() ? "MATCH" : "UNMATCH";

function nameResult(score: string, threshold: number): NameResult {
  if (score === IDENTICAL) return "MATCH";
  return Number(score) * PERCENT >= threshold ? "FUZZY" : "UNMATCH";
}

/** Banding satu kandidat dengan pemohon; skor memakai algoritma dan ambang `DedupFieldSetting` tiap field. */
export function compareCandidate(
  subject: DedupSubject,
  candidate: DedupCandidateInput,
  settings: FieldSettings,
): CandidateComparison {
  const nameScoreValue = nameScore(settings.fullNameId.algorithm, subject.fullNameId, candidate.fullNameId);
  const motherScoreValue = nameScore(
    settings.motherMaidenName.algorithm,
    subject.motherMaidenName,
    candidate.motherMaidenName,
  );
  return {
    candidate,
    nikResult: candidate.sameNik ? "MATCH" : "UNMATCH",
    dobResult: sameText(subject.dateOfBirth, candidate.dateOfBirth),
    pobResult: sameText(subject.placeOfBirth, candidate.placeOfBirth),
    nameScore: nameScoreValue,
    motherNameScore: motherScoreValue,
    nameResult: nameResult(nameScoreValue, settings.fullNameId.fuzzyThreshold),
    motherResult: nameResult(motherScoreValue, settings.motherMaidenName.fuzzyThreshold),
  };
}

const exactCell = (condition: MatrixCondition, result: DedupFieldResult) => condition === "ANY" || condition === result;
const fuzzyCell = (condition: FuzzyCondition, result: NameResult) => condition === "ANY" || condition === result;

function rowMatches(row: MatrixRow, comparison: CandidateComparison): boolean {
  return (
    exactCell(row.nik, comparison.nikResult) &&
    fuzzyCell(row.fullNameId, comparison.nameResult) &&
    exactCell(row.dob, comparison.dobResult) &&
    exactCell(row.pob, comparison.pobResult) &&
    fuzzyCell(row.motherMaidenName, comparison.motherResult)
  );
}

/**
 * Hasil satu kandidat: baris matrix pertama menurut prioritas yang cocok (AC-59.01). Kandidat tanpa baris yang cocok
 * berarti matrix tidak lengkap, jadi dibawa ke `REVIEW` dan bukan dianggap pemohon baru.
 */
function outcomeOf(
  comparison: CandidateComparison,
  matrix: readonly MatrixRow[],
): { outcome: DedupOutcome; row: MatrixRow | null } {
  const row = matrix.find((candidateRow) => rowMatches(candidateRow, comparison));
  return row ? { outcome: row.dedupOutcome, row } : { outcome: "REVIEW", row: null };
}

/** Kandidat yang layak dicatat: NIK sama atau nama cukup mirip; sisanya hanya berbagi tanggal lahir. */
const isRelevant = (comparison: CandidateComparison) =>
  comparison.candidate.sameNik || comparison.nameResult !== "UNMATCH";

/**
 * Keputusan langkah DEDUP (api-specs 19 §19.1, TRM_DDP_001 s.d. 007). NIK kosong = `SKIP`; NIK sama dengan pengajuan
 * `ON_PROGRESS` = `DUPLICATE_IN_FLIGHT` tanpa melihat matrix; selain itu hasil kandidat dipilih menurut
 * `OUTCOME_PRECEDENCE`, dan tanpa kandidat pemohon `UNMATCH`.
 */
export function evaluateDedup(
  subject: DedupSubject,
  candidates: readonly DedupCandidateInput[],
  matrix: readonly MatrixRow[],
  settings: FieldSettings,
): DedupEvaluation {
  if (subject.nik.trim() === "") return { outcome: "SKIP", matched: null, matrixRow: null, comparisons: [] };
  const comparisons = candidates.map((candidate) => compareCandidate(subject, candidate, settings)).filter(isRelevant);
  const inFlight = comparisons.find(
    (comparison) => comparison.candidate.sameNik && comparison.candidate.status === IN_FLIGHT_STATUS,
  );
  if (inFlight) return { outcome: "DUPLICATE_IN_FLIGHT", matched: inFlight, matrixRow: null, comparisons };
  const ordered = [...matrix].sort((left, right) => left.priority - right.priority);
  const decided = comparisons.map((comparison) => ({ comparison, ...outcomeOf(comparison, ordered) }));
  for (const outcome of OUTCOME_PRECEDENCE) {
    const winner = decided.find((entry) => entry.outcome === outcome);
    if (winner) {
      const matched = outcome === "UNMATCH" || outcome === "SKIP" ? null : winner.comparison;
      return { outcome, matched, matrixRow: winner.row, comparisons };
    }
  }
  return { outcome: "UNMATCH", matched: null, matrixRow: null, comparisons };
}
