import type { ModuleOutcomes } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { requireAllOutcomes } from "./decision-errors.js";
import { decide, type MatrixRule, place } from "./matrix-rules.js";

const ANY_ROW = {
  dedupOutcome: "ANY",
  dukcapilOutcome: "ANY",
  fraudOutcome: "ANY",
  racOutcome: "ANY",
  scoringOutcome: "ANY",
  creditBureauOutcome: "ANY",
  description: null,
} as const;
const rule = (id: string, priority: number, fields: Partial<MatrixRule>): MatrixRule => ({
  ...ANY_ROW,
  id,
  priority,
  decisionOutcome: "GO",
  ...fields,
});
const CLEAN_APPLICANT: ModuleOutcomes = {
  dedupOutcome: "UNMATCH",
  dukcapilOutcome: "PASSED",
  fraudOutcome: "CLEAN",
  racOutcome: "PASS",
  scoringOutcome: "PASS",
  creditBureauOutcome: "COLLECT_1",
};

describe("decide", () => {
  it("AC-36.02 decides Go with the matching row for a clean combination", () => {
    const go = rule("go", 4, { ...CLEAN_APPLICANT, decisionOutcome: "GO" });

    expect(decide([go], CLEAN_APPLICANT)).toEqual({ decisionOutcome: "GO", matchedRow: go, note: null });
  });

  it("AC-36.03 decides NotGo with the default note when no row matches", () => {
    const go = rule("go", 1, { ...CLEAN_APPLICANT });

    expect(decide([go], { ...CLEAN_APPLICANT, creditBureauOutcome: "COLLECT_3" })).toEqual({
      decisionOutcome: "NOTGO",
      matchedRow: null,
      note: "No matching rule, default decision applied",
    });
  });

  it("AC-36.05 uses the [ANY] row with the lowest priority number", () => {
    const collect5 = rule("p1", 1, { creditBureauOutcome: "COLLECT_5", decisionOutcome: "NOTGO" });
    const scoringPass = rule("p2", 2, { scoringOutcome: "PASS", decisionOutcome: "GO" });

    const decision = decide([scoringPass, collect5], { ...CLEAN_APPLICANT, creditBureauOutcome: "COLLECT_5" });

    expect(decision).toMatchObject({ decisionOutcome: "NOTGO", matchedRow: { id: "p1", priority: 1 } });
  });

  it("AC-69.03 matches SKIP only with a SKIP or [ANY] column", () => {
    const skipSlik = rule("skip", 1, { ...CLEAN_APPLICANT, creditBureauOutcome: "SKIP" });

    expect(decide([skipSlik], { ...CLEAN_APPLICANT, creditBureauOutcome: "SKIP" }).matchedRow?.id).toBe("skip");
    expect(decide([skipSlik], CLEAN_APPLICANT).matchedRow).toBeNull();
  });
});

describe("place", () => {
  const rows = [rule("a", 1, {}), rule("b", 2, {}), rule("c", 4, {})];
  const order = (placed: MatrixRule[]) => placed.map((row) => `${row.id}:${row.priority}`);

  it("shifts rows at and after a taken priority by one", () => {
    expect(order(place(rows, rule("new", 2, {})))).toEqual(["a:1", "new:2", "b:3", "c:5"]);
  });

  it("keeps other rows when the priority is free", () => {
    expect(order(place(rows, rule("new", 3, {})))).toEqual(["a:1", "b:2", "new:3", "c:4"]);
  });

  it("moves an existing row without shifting itself", () => {
    expect(order(place(rows, rule("c", 1, {})))).toEqual(["c:1", "a:2", "b:3"]);
  });
});

describe("requireAllOutcomes", () => {
  it("AC-36.04 rejects a simulation without RAC, Scoring, and SLIK with OUTCOME_REQUIRED", () => {
    const partial = { dedupOutcome: "UNMATCH", dukcapilOutcome: "PASSED", fraudOutcome: "CLEAN" } as const;

    expect(() => requireAllOutcomes(partial)).toThrow(DomainError);
    expect(() => requireAllOutcomes(partial)).toThrow(
      expect.objectContaining({
        code: "OUTCOME_REQUIRED",
        status: 422,
        message: "Select an outcome for every module",
        details: ["racOutcome", "scoringOutcome", "creditBureauOutcome"].map((field) =>
          expect.objectContaining({ field }),
        ),
      }),
    );
  });
});
