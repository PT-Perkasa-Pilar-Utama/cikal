import { describe, expect, it } from "vitest";
import { nameScore } from "./name-similarity.js";

describe("name similarity", () => {
  it("scores identical names as 1 regardless of case and extra spaces", () => {
    expect(nameScore("LEVENSHTEIN_RATIO", "Rudi  Hartono ", "RUDI HARTONO")).toBe("1.0000");
  });

  it("scores one changed letter of eleven with Levenshtein ratio, spaces not counted", () => {
    expect(nameScore("LEVENSHTEIN_RATIO", "RUDI HARTONO", "RUDY HARTONO")).toBe("0.9091");
  });

  it("scores Jaro-Winkler higher for a shared prefix", () => {
    expect(Number(nameScore("JARO_WINKLER", "RUDI HARTONO", "RUDI HARTONA"))).toBeGreaterThan(0.95);
  });

  it("ignores word order and extra words with token set ratio", () => {
    expect(nameScore("TOKEN_SET_RATIO", "HARTONO RUDI", "RUDI HARTONO")).toBe("1.0000");
    expect(nameScore("TOKEN_SET_RATIO", "RUDI HARTONO", "RUDI HARTONO SAPUTRA")).toBe("1.0000");
  });

  it("scores an empty value as 0", () => {
    expect(nameScore("LEVENSHTEIN_RATIO", null, "SITI")).toBe("0.0000");
    expect(nameScore("JARO_WINKLER", "SITI", " ")).toBe("0.0000");
  });
});
