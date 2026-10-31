import { describe, expect, it } from "vitest";
import { applicationTabs } from "./application-tabs.js";
import { formSteps } from "./form-steps.js";

describe("applicationTabs", () => {
  it("AC-84.03 hides Spouse, Business, LKN, and Collateral for an unmarried employee KTA without Survey", () => {
    const steps = formSteps({ productCategory: "NON_COLLATERAL", married: false, selfEmployed: false });
    const tabs = applicationTabs(steps, ["DATA_ENTRY", "DEDUP", "SCORING", "APPROVAL"], true);

    expect(tabs).toEqual([
      "detail",
      "personal",
      "occupation",
      "documents",
      "emergency-contact",
      "workflow",
      "dedup",
      "scoring",
      "approval",
    ]);
    for (const hidden of ["spouse", "business", "lkn", "collateral"]) expect(tabs).not.toContain(hidden);
  });

  it("AC-84.03 shows Spouse, Business, and Collateral for a married self-employed Collateral Loan", () => {
    const steps = formSteps({ productCategory: "COLLATERAL", married: true, selfEmployed: true });

    expect(applicationTabs(steps, [], false)).toEqual([
      "detail",
      "personal",
      "spouse",
      "occupation",
      "business",
      "collateral",
      "documents",
      "emergency-contact",
    ]);
  });

  it("shows LKN for the Survey step and one Scoring tab for RAC and Scoring", () => {
    expect(applicationTabs(["application"], ["SURVEY", "RAC", "SCORING"], true)).toEqual([
      "detail",
      "lkn",
      "workflow",
      "scoring",
    ]);
  });

  it("shows no Workflow tab before the process starts", () => {
    expect(applicationTabs(["application", "personal"], [], false)).toEqual(["detail", "personal"]);
  });
});
