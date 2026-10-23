import { type ApplicationDraftCreateRequest, applicationDraftCreateRequestSchema } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { draftMinimum } from "./draft-minimum.js";

const complete: ApplicationDraftCreateRequest = applicationDraftCreateRequestSchema.parse({
  application: {
    applicationType: "NTB",
    productCategory: "NON_COLLATERAL",
    productId: "0192b6f3-0001-7000-8000-000000000002",
  },
  personal: { idType: "KTP", idCardNumber: "3273011402900001", fullName: "Rudi Hartono", fullNameId: "RUDI HARTONO" },
});

const without = (section: "application" | "personal", field: string, value: unknown = undefined) => ({
  ...complete,
  [section]: { ...complete[section], [field]: value },
});

describe("draftMinimum", () => {
  it("returns the seven minimum fields of a complete draft", () => {
    expect(draftMinimum(complete)).toEqual({ ...complete.application, ...complete.personal });
  });

  it.each([
    ["application", "applicationType"],
    ["application", "productCategory"],
    ["application", "productId"],
    ["personal", "idType"],
    ["personal", "idCardNumber"],
    ["personal", "fullName"],
    ["personal", "fullNameId"],
  ] as const)("AC-49.02 rejects a draft without %s.%s", (section, field) => {
    expect(() => draftMinimum(without(section, field))).toThrow(
      expect.objectContaining({
        code: "DRAFT_MINIMUM_FIELDS",
        status: 422,
        message:
          "Fill in Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, and Full Name ID to save a draft",
      }),
    );
  });

  it("AC-49.02 treats a blank text field as not filled", () => {
    expect(() => draftMinimum(without("personal", "fullName", ""))).toThrow("to save a draft");
  });
});
