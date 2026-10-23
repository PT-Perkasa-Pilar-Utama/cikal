import { emergencyContactSectionInputSchema } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { emergencyContactSectionError } from "./emergency-contact-section-rules.js";

const MOBILE_MESSAGE = "Mobile number must start with 08 and contain 10 to 13 digits";
const APPLICANT_MOBILE = "081234567890";

/** Kontak darurat AC-48.01. */
const dewi = (mobileNumber: string) =>
  emergencyContactSectionInputSchema.parse({
    contactName: "Dewi",
    mobileNumber,
    relationToApplicant: "002",
    address: { address: "Jl. Braga 5" },
  });

describe("emergency contact section rules", () => {
  it("AC-48.01 accepts a complete emergency contact", () => {
    expect(emergencyContactSectionError(dewi("081298765432"), APPLICANT_MOBILE)).toBeNull();
  });

  it.each([
    ["AC-48.02", "12345"],
    ["AC-48.04", "08123456789012"],
  ])("%s rejects mobile number %s", (_ac, mobileNumber) => {
    const parsed = emergencyContactSectionInputSchema.safeParse({ mobileNumber });

    expect(parsed.error?.issues.map((issue) => issue.message)).toEqual([MOBILE_MESSAGE]);
  });

  it("AC-48.03 rejects the applicant's own mobile number", () => {
    const error = emergencyContactSectionError(dewi(APPLICANT_MOBILE), APPLICANT_MOBILE);

    expect(error && { code: error.code, status: error.status, message: error.message }).toEqual({
      code: "EMERGENCY_CONTACT_SAME_NUMBER",
      status: 422,
      message: "Emergency contact number must be different from applicant number",
    });
  });

  it("marks empty required fields with This field is required", () => {
    const error = emergencyContactSectionError(emergencyContactSectionInputSchema.parse({}), APPLICANT_MOBILE);

    expect(error?.details.map((detail) => detail.field)).toEqual([
      "contactName",
      "relationToApplicant",
      "mobileNumber",
      "address.address",
    ]);
  });
});
