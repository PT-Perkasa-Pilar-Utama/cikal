import { describe, expect, it } from "vitest";
import { aggregateCollectibility, collectibilityLabel } from "./collectibility.js";

const active = (collectibility: number) => ({ collectibility, condition: "ACTIVE" as const });

describe("collectibility", () => {
  it("AC-68.02 TRM_SLK_007 takes the worst collectibility of active facilities and ignores closed ones", () => {
    const facilities = [active(1), active(3), active(2), { collectibility: 5, condition: "CLOSED" as const }];

    expect(aggregateCollectibility(facilities)).toEqual({ ok: true, collectibility: 3 });
  });

  it("AC-68.02 TRM_SLK_005 has no collectibility without facilities", () => {
    expect(aggregateCollectibility([])).toEqual({ ok: true, collectibility: null });
  });

  it("AC-68.02 TRM_SLK_006 rejects a collectibility outside 1 to 5", () => {
    expect(aggregateCollectibility([active(6)])).toEqual({ ok: false, message: "Invalid collectibility value: 6" });
  });

  it("AC-68.01 labels collectibility 1 as Good and no history as No credit history", () => {
    expect(collectibilityLabel({ collectibility: 1, quality: "Good", outcome: "COLLECT_1" })).toBe(
      "Collectibility 1 - Good",
    );
    expect(collectibilityLabel({ collectibility: null, quality: "No history", outcome: "NO_HISTORY" })).toBe(
      "No credit history",
    );
  });
});
