import { describe, expect, it } from "vitest";
import { stepOutcomes } from "./step-outcomes.js";

describe("stepOutcomes", () => {
  it("returns the outcome code of completed steps and SKIP for skipped steps (AC-69.03)", () => {
    expect(
      stepOutcomes([
        { stepCode: "DEDUP", status: "COMPLETED", outcomeCode: "UNMATCH" },
        { stepCode: "CREDIT_BUREAU", status: "SKIPPED", outcomeCode: null },
        { stepCode: "SCORING", status: "RUNNING", outcomeCode: null },
        { stepCode: "DECISION", status: "PENDING", outcomeCode: null },
      ]),
    ).toEqual({ DEDUP: "UNMATCH", CREDIT_BUREAU: "SKIP" });
  });
});
