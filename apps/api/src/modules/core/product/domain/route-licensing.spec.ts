import { describe, expect, it } from "vitest";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { assertRouteStepsLicensed, licensedRouteSteps } from "./route-licensing.js";

/** Lisensi POC tanpa M12 SIKP (TASK_BREAKDOWN "Lisensi POC"). */
const POC_MODULES: ReadonlySet<string> = new Set(["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M15"]);

describe("route editor licensing (api-specs 08 §8.9, §8.10)", () => {
  it("leaves the SIKP toggle out of the editor when M12 is not licensed (AC-31.08, AC-100.03)", () => {
    const steps = licensedRouteSteps(POC_MODULES);
    expect(steps).not.toContain("SIKP");
    expect(steps.slice(0, 4)).toEqual(["DATA_ENTRY", "DEDUP", "DUKCAPIL", "VERIFICATION"]);
  });

  it("shows the SIKP toggle once M12 is licensed", () => {
    expect(licensedRouteSteps(new Set([...POC_MODULES, "M12"]))).toContain("SIKP");
  });

  it("rejects a submitted SIKP step with MODULE_NOT_LICENSED_STEP", () => {
    const submit = () => assertRouteStepsLicensed([{ stepCode: "DEDUP" }, { stepCode: "SIKP" }], POC_MODULES);
    expect(submit).toThrow(DomainError);
    expect(submit).toThrow(
      expect.objectContaining({
        code: "MODULE_NOT_LICENSED_STEP",
        status: 422,
        message: "Module SIKP is not licensed",
      }),
    );
  });

  it("accepts steps of licensed modules only", () => {
    expect(() =>
      assertRouteStepsLicensed([{ stepCode: "DEDUP" }, { stepCode: "APPROVAL" }], POC_MODULES),
    ).not.toThrow();
  });
});
