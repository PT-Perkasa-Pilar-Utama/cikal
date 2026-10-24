import { describe, expect, it } from "vitest";
import { seedDedupMatrixRows } from "../seed/dedup-matrix.js";
import { evaluateDedup } from "./dedup-rules.js";
import type { DedupCandidateInput, DedupSubject, FieldSettings } from "./dedup-types.js";

const SETTINGS: FieldSettings = {
  fullNameId: { algorithm: "LEVENSHTEIN_RATIO", fuzzyThreshold: 80 },
  motherMaidenName: { algorithm: "LEVENSHTEIN_RATIO", fuzzyThreshold: 80 },
};
const SUBJECT: DedupSubject = {
  nik: "3273011402900001",
  fullNameId: "RUDI HARTONO",
  placeOfBirth: "Bandung",
  dateOfBirth: "1990-02-14",
  motherMaidenName: "SITI AMINAH",
};
const candidate = (fields: Partial<DedupCandidateInput> = {}): DedupCandidateInput => ({
  applicationId: "0192b6b0-0004-7000-8000-000000000001",
  loanId: "15092026KTA0000004",
  status: "DISBURSED",
  sameNik: true,
  fullNameId: SUBJECT.fullNameId,
  placeOfBirth: SUBJECT.placeOfBirth,
  dateOfBirth: SUBJECT.dateOfBirth,
  motherMaidenName: SUBJECT.motherMaidenName,
  ...fields,
});
const evaluate = (candidates: DedupCandidateInput[], subject: DedupSubject = SUBJECT) =>
  evaluateDedup(subject, candidates, seedDedupMatrixRows, SETTINGS);

describe("dedup rules", () => {
  it("AC-59.01 TRM_DDP_001 matches when every field matches", () => {
    const result = evaluate([candidate()]);

    expect(result).toMatchObject({ outcome: "MATCH", matrixRow: { priority: 1 } });
    expect(result.matched?.candidate.loanId).toBe("15092026KTA0000004");
    expect(result.comparisons[0]).toMatchObject({ nameScore: "1.0000", motherNameScore: "1.0000" });
  });

  it("AC-59.01 TRM_DDP_002 reviews a fuzzy name and mother name with the same NIK", () => {
    const result = evaluate([candidate({ fullNameId: "RUDY HARTONO", motherMaidenName: "SITI AMINA" })]);

    expect(result).toMatchObject({ outcome: "REVIEW", matrixRow: { priority: 2 } });
    expect(result.comparisons[0]).toMatchObject({ nameResult: "FUZZY", motherResult: "FUZZY" });
  });

  it("AC-59.01 TRM_DDP_003 is UnMatch for a different NIK and a different name", () => {
    const result = evaluate([candidate({ sameNik: false, fullNameId: "BUDI SANTOSO" })]);

    expect(result).toEqual({ outcome: "UNMATCH", matched: null, matrixRow: null, comparisons: [] });
  });

  it("AC-59.01 TRM_DDP_003 is UnMatch when a similar name has a different NIK", () => {
    const result = evaluate([candidate({ sameNik: false })]);

    expect(result).toMatchObject({ outcome: "UNMATCH", matched: null, matrixRow: { priority: 6 } });
  });

  it("AC-59.01 TRM_DDP_004 reviews the same NIK with every other field different", () => {
    const result = evaluate([
      candidate({
        fullNameId: "BUDI SANTOSO",
        placeOfBirth: "Medan",
        dateOfBirth: "1985-07-01",
        motherMaidenName: "RATNA SARI",
      }),
    ]);

    expect(result).toMatchObject({ outcome: "REVIEW", matrixRow: { priority: 3 } });
  });

  it("AC-59.01 TRM_DDP_005 skips without candidates when the NIK is empty", () => {
    const result = evaluate([candidate()], { ...SUBJECT, nik: " " });

    expect(result).toEqual({ outcome: "SKIP", matched: null, matrixRow: null, comparisons: [] });
  });

  it("AC-59.01 TRM_DDP_007 is Duplicate In-Flight for the same NIK on an application still in progress", () => {
    const result = evaluate([candidate({ status: "ON_PROGRESS", fullNameId: "BUDI SANTOSO" })]);

    expect(result).toMatchObject({ outcome: "DUPLICATE_IN_FLIGHT", matrixRow: null });
    expect(result.matched?.candidate.status).toBe("ON_PROGRESS");
  });

  it("prefers Review over Match when candidates disagree", () => {
    const result = evaluate([
      candidate(),
      candidate({ applicationId: "0192b6b0-0005-7000-8000-000000000001", fullNameId: "RUDY HARTONO" }),
    ]);

    expect(result.outcome).toBe("REVIEW");
    expect(result.comparisons).toHaveLength(2);
  });

  it("reviews a same-NIK candidate that no matrix row covers", () => {
    const result = evaluateDedup(SUBJECT, [candidate({ fullNameId: "BUDI SANTOSO" })], [], SETTINGS);

    expect(result).toMatchObject({ outcome: "REVIEW", matrixRow: null });
  });

  it("is UnMatch without candidates", () => {
    expect(evaluate([]).outcome).toBe("UNMATCH");
  });
});
