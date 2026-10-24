import { describe, expect, it } from "vitest";
import { moduleOutcomesFrom } from "./step-outcome-mapping.js";

const CLEAN = {
  DEDUP: "UNMATCH",
  DUKCAPIL: "PASSED",
  FRAUD: "CLEAN",
  RAC: "PASS",
  SCORING: "PASS",
  CREDIT_BUREAU: "COLLECT_1",
};

describe("moduleOutcomesFrom", () => {
  it("maps the six step outcomes to a matrix combination (AC-69.01)", () => {
    expect(moduleOutcomesFrom(CLEAN)).toEqual({
      ok: true,
      outcomes: {
        dedupOutcome: "UNMATCH",
        dukcapilOutcome: "PASSED",
        fraudOutcome: "CLEAN",
        racOutcome: "PASS",
        scoringOutcome: "PASS",
        creditBureauOutcome: "COLLECT_1",
      },
    });
  });

  it("AC-69.03 treats a step skipped by the route, or never recorded, as SKIP", () => {
    const { CREDIT_BUREAU: _slik, SCORING: _scoring, ...rest } = CLEAN;

    expect(moduleOutcomesFrom({ ...rest, SCORING: "SKIP" })).toMatchObject({
      ok: true,
      outcomes: { scoringOutcome: "SKIP", creditBureauOutcome: "SKIP" },
    });
  });

  it("rejects a step outcome that the matrix does not know", () => {
    expect(moduleOutcomesFrom({ ...CLEAN, DUKCAPIL: "REVIEW" })).toEqual({
      ok: false,
      message: "Step DUKCAPIL outcome REVIEW is not a Decision Matrix value",
    });
  });
});
