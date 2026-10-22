import { describe, expect, it } from "vitest";
import { round } from "./rounding.js";

describe("round", () => {
  it("rounds half up without float drift", () => {
    expect(round("8884878.8678", 0)).toBe("8884879");
    expect(round("0.125", 2)).toBe("0.13");
    expect(round("1.005", 2)).toBe("1.01");
  });

  it("supports up and down modes", () => {
    expect(round("10.001", 2, "UP")).toBe("10.01");
    expect(round("10.009", 2, "DOWN")).toBe("10.00");
  });
});
