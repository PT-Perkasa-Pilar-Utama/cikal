import { describe, expect, it } from "vitest";
import { currentStep, inStepOrder, routeSkipReason } from "./route-plan.js";

const POC_LICENSES = new Set(["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M15"]);

describe("route skip reason", () => {
  it("skips a step turned off in the route as not in route (AC-85.02)", () => {
    const route = [{ stepCode: "SURVEY", isEnabled: false }] as const;
    expect(routeSkipReason("SURVEY", route, new Set([...POC_LICENSES, "M05"]))).toBe("NOT_IN_ROUTE");
  });

  it("keeps not in route for a step turned off whose module lost its licence", () => {
    expect(routeSkipReason("SURVEY", [{ stepCode: "SURVEY", isEnabled: false }], POC_LICENSES)).toBe("NOT_IN_ROUTE");
  });

  it("skips an enabled step of an unlicensed module as not licensed", () => {
    expect(routeSkipReason("CREDIT_BUREAU", [{ stepCode: "CREDIT_BUREAU", isEnabled: true }], new Set(["CORE"]))).toBe(
      "NOT_LICENSED",
    );
  });

  it("skips the NAME_SCREENING slot as not licensed when the route editor never showed M16", () => {
    expect(routeSkipReason("NAME_SCREENING", [{ stepCode: "DEDUP", isEnabled: true }], POC_LICENSES)).toBe(
      "NOT_LICENSED",
    );
  });

  it("skips a licensed step missing from the route version as not in route", () => {
    expect(routeSkipReason("FRAUD", [{ stepCode: "DEDUP", isEnabled: true }], POC_LICENSES)).toBe("NOT_IN_ROUTE");
  });

  it("runs an enabled step of a licensed module", () => {
    expect(routeSkipReason("DEDUP", [{ stepCode: "DEDUP", isEnabled: true }], POC_LICENSES)).toBeNull();
  });
});

describe("current step", () => {
  it("returns the first step in standard order that is not completed or skipped", () => {
    const steps = [
      { stepCode: "FRAUD", status: "PENDING" },
      { stepCode: "DATA_ENTRY", status: "COMPLETED" },
      { stepCode: "SURVEY", status: "SKIPPED" },
      { stepCode: "DEDUP", status: "ERROR" },
    ] as const;
    expect(currentStep(steps)?.stepCode).toBe("DEDUP");
  });

  it("returns null when every step is done", () => {
    expect(currentStep([{ stepCode: "DATA_ENTRY", status: "COMPLETED" }])).toBeNull();
  });
});

describe("step order", () => {
  it("orders steps by the standard route order, with NAME_SCREENING between DUKCAPIL and VERIFICATION", () => {
    const steps = [{ stepCode: "VERIFICATION" }, { stepCode: "NAME_SCREENING" }, { stepCode: "DUKCAPIL" }] as const;
    expect(inStepOrder(steps).map((step) => step.stepCode)).toEqual(["DUKCAPIL", "NAME_SCREENING", "VERIFICATION"]);
  });
});
