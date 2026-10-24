import type { ApplicationStatus, DedupFieldResult, DedupOutcome } from "@cikal/contracts";

export type MatrixCondition = "MATCH" | "UNMATCH" | "ANY";
export type FuzzyCondition = MatrixCondition | "FUZZY";
export type DedupAlgorithm = "LEVENSHTEIN_RATIO" | "JARO_WINKLER" | "TOKEN_SET_RATIO";
export type DedupFieldCode = "FULL_NAME_ID" | "MOTHER_MAIDEN_NAME";
/** Hasil banding field nama: `FUZZY` bila skor mencapai ambang tetapi belum sama persis. */
export type NameResult = "MATCH" | "FUZZY" | "UNMATCH";

export interface FieldSetting {
  algorithm: DedupAlgorithm;
  /** Ambang 50 s.d. 100; skor 0,88 dibandingkan dengan 88. */
  fuzzyThreshold: number;
}

export interface FieldSettings {
  fullNameId: FieldSetting;
  motherMaidenName: FieldSetting;
}

export interface MatrixRow {
  id: string;
  priority: number;
  nik: MatrixCondition;
  fullNameId: FuzzyCondition;
  dob: MatrixCondition;
  pob: MatrixCondition;
  motherMaidenName: FuzzyCondition;
  dedupOutcome: "MATCH" | "UNMATCH" | "REVIEW" | "SKIP";
}

/** Pemohon yang dicek; NIK kosong membuat langkah `SKIP` (TRM_DDP_005). */
export interface DedupSubject {
  nik: string;
  fullNameId: string;
  placeOfBirth: string | null;
  dateOfBirth: string | null;
  motherMaidenName: string | null;
}

export interface DedupCandidateInput {
  applicationId: string;
  loanId: string;
  status: ApplicationStatus;
  sameNik: boolean;
  fullNameId: string;
  placeOfBirth: string | null;
  dateOfBirth: string | null;
  motherMaidenName: string | null;
}

export interface CandidateComparison {
  candidate: DedupCandidateInput;
  nikResult: DedupFieldResult;
  dobResult: DedupFieldResult;
  pobResult: DedupFieldResult;
  nameScore: string;
  motherNameScore: string;
  nameResult: NameResult;
  motherResult: NameResult;
}

export interface DedupEvaluation {
  outcome: DedupOutcome;
  /** Kandidat penentu hasil `MATCH`, `REVIEW`, atau `DUPLICATE_IN_FLIGHT`; kosong untuk `UNMATCH` dan `SKIP`. */
  matched: CandidateComparison | null;
  matrixRow: MatrixRow | null;
  comparisons: CandidateComparison[];
}
