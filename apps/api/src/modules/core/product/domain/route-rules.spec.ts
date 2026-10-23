import type { RouteStepSetting } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { assertMandatoryStepsEnabled, changedRouteSteps, routeEditorSteps, sameRoute } from "./route-rules.js";

const POC_MODULES: ReadonlySet<string> = new Set(["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M15"]);
const WITHOUT_M15: ReadonlySet<string> = new Set(["CORE", "M06", "M07", "M08", "M09", "M10", "M11"]);

const on = (...codes: RouteStepSetting["stepCode"][]): RouteStepSetting[] =>
  codes.map((stepCode) => ({ stepCode, isEnabled: true }));
const MANDATORY_ON = on("DATA_ENTRY", "APPROVAL", "VALIDITY_CHECK", "PRINT_AKAD", "DISBURSEMENT");

describe("route rules (api-specs 08 §8.9, §8.10)", () => {
  it("AC-31.02 refuses to turn Approval off", () => {
    const steps = [
      ...on("DATA_ENTRY", "VALIDITY_CHECK", "PRINT_AKAD", "DISBURSEMENT"),
      { stepCode: "APPROVAL" as const, isEnabled: false },
    ];
    expect(() => assertMandatoryStepsEnabled(steps, POC_MODULES)).toThrow(
      expect.objectContaining({
        code: "MANDATORY_STEP",
        status: 422,
        message: "Approval is a mandatory module and cannot be turned off",
      }),
    );
  });

  it("AC-31.02 treats a mandatory step left out of the request as turned off", () => {
    expect(() => assertMandatoryStepsEnabled(on("DATA_ENTRY", "APPROVAL"), POC_MODULES)).toThrow(
      expect.objectContaining({ message: "Validity Check is a mandatory module and cannot be turned off" }),
    );
  });

  it("requires the M15 steps only while M15 is licensed (RT-03)", () => {
    expect(() => assertMandatoryStepsEnabled(on("DATA_ENTRY", "APPROVAL"), WITHOUT_M15)).not.toThrow();
    expect(() => assertMandatoryStepsEnabled(MANDATORY_ON, POC_MODULES)).not.toThrow();
  });

  it("AC-31.05 sees no change when the same licensed steps are on", () => {
    const active = [...MANDATORY_ON, ...on("DEDUP"), { stepCode: "FRAUD" as const, isEnabled: false }];
    expect(sameRoute([...MANDATORY_ON, ...on("DEDUP")], active, POC_MODULES)).toBe(true);
    expect(sameRoute(MANDATORY_ON, active, POC_MODULES)).toBe(false);
  });

  it("ignores steps of unlicensed modules when comparing with the active version", () => {
    expect(sameRoute(MANDATORY_ON, [...MANDATORY_ON, ...on("SIKP")], POC_MODULES)).toBe(true);
  });

  it("names the steps that changed against the active version", () => {
    const active = [...MANDATORY_ON, ...on("DEDUP", "FRAUD")];
    const proposed = [
      ...MANDATORY_ON,
      ...on("DEDUP", "CREDIT_BUREAU"),
      { stepCode: "FRAUD" as const, isEnabled: false },
    ];
    expect(changedRouteSteps(active, proposed)).toEqual(["steps.FRAUD", "steps.CREDIT_BUREAU"]);
    expect(changedRouteSteps(null, on("DATA_ENTRY", "APPROVAL"))).toEqual(["steps.DATA_ENTRY", "steps.APPROVAL"]);
  });

  it("AC-31.06 lists licensed steps in standard order with mandatory and conditional flags", () => {
    const steps = routeEditorSteps([...MANDATORY_ON, ...on("SIKP")], new Set([...POC_MODULES, "M12"]));
    expect(steps[0]).toEqual({
      stepCode: "DATA_ENTRY",
      moduleCode: "CORE",
      order: 1,
      isEnabled: true,
      isMandatory: true,
      isConditional: false,
    });
    expect(steps.find((step) => step.stepCode === "SIKP")).toMatchObject({ order: 12, isConditional: true });
    expect(steps.find((step) => step.stepCode === "DEDUP")).toMatchObject({ isEnabled: false, isMandatory: false });
    expect(steps.map((step) => step.stepCode)).not.toContain("SURVEY");
  });
});
