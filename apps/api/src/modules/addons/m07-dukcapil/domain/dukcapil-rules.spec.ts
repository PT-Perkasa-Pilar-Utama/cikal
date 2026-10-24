import { describe, expect, it } from "vitest";
import { type DukcapilAnswer, type DukcapilRule, judgeDukcapil } from "./dukcapil-rules.js";

/** Bobot nama 60%, nama ibu 40%, ambang Passed 0,90, Review 0,75 (AC-61.01). */
const RULE: DukcapilRule = {
  nameWeight: "60.0000",
  motherNameWeight: "40.0000",
  passedThreshold: "0.9000",
  reviewThreshold: "0.7500",
  notFoundOutcome: "REVIEW",
};
const answer = (fields: Partial<DukcapilAnswer> = {}): DukcapilAnswer => ({
  recordFound: true,
  dobMatch: true,
  pobMatch: true,
  fullNameScore: "1.0000",
  motherNameScore: "1.0000",
  ...fields,
});
const scored = (fullNameScore: string, motherNameScore: string) =>
  judgeDukcapil(RULE, answer({ fullNameScore, motherNameScore }));

describe("dukcapil rules", () => {
  it("AC-61.01 TRM_DKC_001 passes with score 1.00", () => {
    expect(scored("1.0000", "1.0000")).toEqual({
      outcome: "PASSED",
      dobStatus: "MATCH",
      pobStatus: "MATCH",
      finalScore: "1.0000",
    });
  });

  it("AC-61.01 TRM_DKC_002 passes with a score exactly at the Passed threshold", () => {
    expect(scored("0.9000", "0.9000")).toMatchObject({ outcome: "PASSED", finalScore: "0.9000" });
  });

  it("AC-61.01 TRM_DKC_003 reviews a weighted score of 0.88", () => {
    expect(scored("0.9000", "0.8500")).toMatchObject({ outcome: "REVIEW", finalScore: "0.8800" });
  });

  it("AC-61.01 TRM_DKC_004 reviews a score exactly at the Review threshold", () => {
    expect(scored("0.7500", "0.7500")).toMatchObject({ outcome: "REVIEW", finalScore: "0.7500" });
  });

  it("AC-61.01 TRM_DKC_005 fails a score below the Review threshold", () => {
    expect(scored("0.7400", "0.7400")).toMatchObject({ outcome: "FAILED", finalScore: "0.7400" });
  });

  it("AC-61.01 TRM_DKC_006 fails a different date of birth without a score", () => {
    expect(judgeDukcapil(RULE, answer({ dobMatch: false }))).toEqual({
      outcome: "FAILED",
      dobStatus: "NOT_MATCH",
      pobStatus: "MATCH",
      finalScore: null,
    });
  });

  it("AC-61.01 TRM_DKC_007 fails a different place of birth without a score", () => {
    expect(judgeDukcapil(RULE, answer({ pobMatch: false }))).toMatchObject({
      outcome: "FAILED",
      pobStatus: "NOT_MATCH",
      finalScore: null,
    });
  });

  it("uses the rule outcome for a NIK that Dukcapil does not know", () => {
    expect(judgeDukcapil(RULE, answer({ recordFound: false }))).toMatchObject({ outcome: "REVIEW", finalScore: null });
    expect(judgeDukcapil({ ...RULE, notFoundOutcome: "FAILED" }, answer({ recordFound: false })).outcome).toBe(
      "FAILED",
    );
  });
});
