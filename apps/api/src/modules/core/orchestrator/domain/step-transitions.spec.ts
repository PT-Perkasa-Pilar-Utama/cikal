import type { StepResult } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { canProcessTransition, canStepTransition, processStatusAfter, stepStatusFor } from "./step-transitions.js";

const results: Record<StepResult["type"], StepResult> = {
  CONTINUE: { type: "CONTINUE", outcomeCode: "PASSED", summary: "Passed" },
  WAIT_HUMAN: {
    type: "WAIT_HUMAN",
    queueCode: "VERIFICATION",
    branchId: "0192b6a9-0001-7000-8000-000000000001",
    summary: "",
  },
  WAIT_EXTERNAL: { type: "WAIT_EXTERNAL", externalReference: "REF-1", waitDeadline: new Date(), summary: "" },
  BACK_TO_DRAFT: { type: "BACK_TO_DRAFT", outcomeCode: "NOT_MATCH", returnNote: "KTP blur" },
  RECONTEST: { type: "RECONTEST", outcomeCode: "NOTGO", summary: "Not Go" },
  FINISH: { type: "FINISH", outcomeCode: "REJECT", applicationStatus: "FINISHED_REJECTED", summary: "Rejected" },
  ERROR: { type: "ERROR", errorCategory: "TIMEOUT", errorMessage: "Dukcapil service timeout", retryable: true },
};

describe("step execution transitions", () => {
  it.each([
    ["PENDING", "SKIPPED"],
    ["PENDING", "RUNNING"],
    ["RUNNING", "COMPLETED"],
    ["RUNNING", "WAITING_HUMAN"],
    ["RUNNING", "WAITING_EXTERNAL"],
    ["RUNNING", "ERROR"],
    ["WAITING_HUMAN", "COMPLETED"],
    ["WAITING_EXTERNAL", "COMPLETED"],
    ["WAITING_EXTERNAL", "ERROR"],
    ["ERROR", "RUNNING"],
  ] as const)("allows %s to %s", (from, to) => {
    expect(canStepTransition(from, to)).toBe(true);
  });

  it.each([
    ["PENDING", "COMPLETED"],
    ["WAITING_HUMAN", "ERROR"],
    ["WAITING_HUMAN", "WAITING_HUMAN"],
    ["COMPLETED", "RUNNING"],
    ["SKIPPED", "RUNNING"],
  ] as const)("rejects %s to %s", (from, to) => {
    expect(canStepTransition(from, to)).toBe(false);
  });

  it("maps the seven step results to step statuses", () => {
    const statuses = Object.fromEntries(Object.entries(results).map(([type, result]) => [type, stepStatusFor(result)]));
    expect(statuses).toEqual({
      CONTINUE: "COMPLETED",
      WAIT_HUMAN: "WAITING_HUMAN",
      WAIT_EXTERNAL: "WAITING_EXTERNAL",
      BACK_TO_DRAFT: "COMPLETED",
      RECONTEST: "COMPLETED",
      FINISH: "COMPLETED",
      ERROR: "ERROR",
    });
  });
});

describe("process instance transitions", () => {
  it("maps the seven step results to process statuses", () => {
    const statuses = Object.fromEntries(
      Object.entries(results).map(([type, result]) => [type, processStatusAfter(result, false)]),
    );
    expect(statuses).toEqual({
      CONTINUE: "RUNNING",
      WAIT_HUMAN: "WAITING",
      WAIT_EXTERNAL: "WAITING",
      BACK_TO_DRAFT: "CANCELLED",
      RECONTEST: "CANCELLED",
      FINISH: "COMPLETED",
      ERROR: "WAITING",
    });
  });

  it("keeps the process running while an automatic retry is scheduled", () => {
    expect(processStatusAfter(results.ERROR, true)).toBe("RUNNING");
  });

  it("never reopens a completed or cancelled process", () => {
    expect(canProcessTransition("COMPLETED", "RUNNING")).toBe(false);
    expect(canProcessTransition("CANCELLED", "WAITING")).toBe(false);
  });
});
