import type { StepResult } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { automaticRetryDelaySeconds } from "./retry-policy.js";

const timeout: Extract<StepResult, { type: "ERROR" }> = {
  type: "ERROR",
  errorCategory: "TIMEOUT",
  errorMessage: "Dukcapil service timeout",
  retryable: true,
};

describe("automatic retry", () => {
  it.each([
    [1, 30],
    [2, 120],
    [3, 480],
  ])("waits after attempt %i for %i seconds", (attempt, seconds) => {
    expect(automaticRetryDelaySeconds(timeout, attempt)).toBe(seconds);
  });

  it("stops after the third retry", () => {
    expect(automaticRetryDelaySeconds(timeout, 4)).toBeNull();
  });

  it("never retries a permanent error", () => {
    expect(automaticRetryDelaySeconds({ ...timeout, errorCategory: "AUTH", retryable: false }, 1)).toBeNull();
  });
});
