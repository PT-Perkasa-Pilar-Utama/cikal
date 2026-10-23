import { describe, expect, it } from "vitest";
import { canTransition } from "./application-status.js";

describe("application status transitions", () => {
  it.each([
    ["DRAFT", "ON_PROGRESS"],
    ["ON_PROGRESS", "DRAFT"],
    ["ON_PROGRESS", "RECONTEST"],
    ["ON_PROGRESS", "FINISHED_REJECTED"],
    ["ON_PROGRESS", "APPROVED"],
    ["ON_PROGRESS", "DISBURSED"],
    ["ON_PROGRESS", "FINISHED_CANCELLED"],
    ["RECONTEST", "ON_PROGRESS"],
    ["RECONTEST", "FINISHED_REJECTED"],
  ] as const)("allows %s to %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["DRAFT", "APPROVED"],
    ["RECONTEST", "DISBURSED"],
    ["APPROVED", "DISBURSED"],
    ["FINISHED_CANCELLED", "ON_PROGRESS"],
  ] as const)("rejects %s to %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});
