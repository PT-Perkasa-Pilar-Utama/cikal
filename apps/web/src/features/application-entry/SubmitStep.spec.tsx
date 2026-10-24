import {
  APPLICATION_DRAFT_MESSAGES,
  APPLICATION_SECTION_MESSAGES,
  APPLICATION_SUBMIT_MESSAGES,
  applicationDraftResponseMock,
  applicationSubmitResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  choose,
  clickButton,
  expectStep,
  FLOW_TIMEOUT_MS,
  fieldError,
  rejected,
  sentBody,
  step,
  type,
} from "../../test/application-entry";
import { openStep, SECTIONS_PATH, SUBMIT_PATH, stepRoutes } from "../../test/application-steps";
import type { StubResponse } from "../../test/render-app";

const SAVE_CONTACT = `${SECTIONS_PATH}/emergency-contact?strict=true`;
const MOBILE_FORMAT = APPLICATION_SECTION_MESSAGES.mobileNumber;
const LOAN_ID = applicationDraftResponseMock.data.loanId;
const CONTACT_ADDRESS = "Contact Address";

/** Kontak darurat AC-48.01. */
async function fillContact(mobileNumber = "081234567890") {
  type("Contact Name", "Dewi");
  type("Mobile Number", mobileNumber);
  await choose("Relation with Applicant", "Saudara Kandung");
  type("Address", "Jl. Melati No. 5", CONTACT_ADDRESS);
  await choose("Province", "DKI JAKARTA", CONTACT_ADDRESS);
}

const submitted: StubResponse = { status: 200, body: applicationSubmitResponseMock };

/** Isi kontak, "Submit", lalu "Yes" di konfirmasi "Submit this application?". */
async function submitWith(response: StubResponse) {
  const fetchSpy = await openStep("emergency-contact", stepRoutes({ [`POST ${SUBMIT_PATH}`]: response }));
  await fillContact();
  clickButton("Submit");
  const dialog = await screen.findByRole("dialog", { name: "Submit" });
  expect(dialog).toHaveTextContent("Submit this application?");
  fireEvent.click(within(dialog).getByRole("button", { name: "Yes" }));
  return fetchSpy;
}

describe(
  "New Application - Emergency Contact and Submit",
  () => {
    afterEach(() => vi.restoreAllMocks());

    it("AC-48.01 shows Save as Draft and Submit enabled after the contact is filled", async () => {
      await openStep("emergency-contact");
      await fillContact();

      expect(screen.getByRole("button", { name: "Save as Draft" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    });

    it.each([
      ["AC-48.02", "12345"],
      ["AC-48.04", "08123456789012"],
    ])("%s shows the mobile number format message for %s and does not ask to submit", async (_ac, mobileNumber) => {
      const invalid = rejected(400, "VALIDATION_FAILED", "Please complete all required fields", [
        ["mobileNumber", MOBILE_FORMAT],
      ]);
      const fetchSpy = await openStep("emergency-contact", stepRoutes({ [`PUT ${SAVE_CONTACT}`]: invalid }));
      await fillContact(mobileNumber);

      clickButton("Submit");

      expect(await screen.findByText(MOBILE_FORMAT)).toBeInTheDocument();
      expect(fieldError("Mobile Number")).toHaveTextContent(MOBILE_FORMAT);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(sentBody(fetchSpy, "PUT", SAVE_CONTACT)).toMatchObject({ mobileNumber });
    });

    it("AC-48.03 shows the same-number message under Mobile Number", async () => {
      const message = APPLICATION_SECTION_MESSAGES.emergencyContactSameNumber;
      const sameNumber = rejected(422, "EMERGENCY_CONTACT_SAME_NUMBER", message, [["mobileNumber", message]]);
      await openStep("emergency-contact", stepRoutes({ [`PUT ${SAVE_CONTACT}`]: sameNumber }));
      await fillContact();

      clickButton("Submit");

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(fieldError("Mobile Number")).toHaveTextContent(message);
    });

    it("AC-49.01 saves the first draft from Save as Draft and shows the Loan ID message", async () => {
      const draftSaved = { status: 201, body: applicationDraftResponseMock };
      const fetchSpy = await openStep("application", stepRoutes({ "POST /api/v1/applications": draftSaved }));
      await choose("Application Type", "NTB");
      await choose("Product Category", "Non Collateral Loan");
      await choose("Product", "KTA");
      type("ID Card Number", "3273011402900001");
      type("Full Name", "Rudi Hartono");
      type("Full Name ID", "RUDI HARTONO");

      clickButton("Save as Draft");

      expect(await screen.findByText(`Application saved as draft. Loan ID: ${LOAN_ID}`)).toBeInTheDocument();
      expect(screen.getByText(`Loan ID: ${LOAN_ID}`, { selector: "span" })).toBeInTheDocument();
      await expectStep("Application");
      expect(sentBody(fetchSpy, "POST", "/api/v1/applications")).toMatchObject({ strict: false });
    });

    it("AC-49.01 shows the minimum fields message when Save as Draft lacks the Product", async () => {
      const message = APPLICATION_DRAFT_MESSAGES.draftMinimumFields;
      await openStep(
        "application",
        stepRoutes({ "POST /api/v1/applications": rejected(422, "DRAFT_MINIMUM_FIELDS", message, []) }),
      );

      clickButton("Save as Draft");

      expect(await screen.findByText(message)).toBeInTheDocument();
    });

    it("AC-50.01 submits after Yes with an Idempotency-Key and opens Application List with the Loan ID message", async () => {
      const fetchSpy = await submitWith(submitted);

      expect(await screen.findByRole("heading", { name: "Application List" })).toBeInTheDocument();
      expect(screen.getByText(APPLICATION_SUBMIT_MESSAGES.submitted(LOAN_ID))).toBeInTheDocument();
      const call = fetchSpy.mock.calls.find(
        ([input, init]) => init?.method === "POST" && String(input) === SUBMIT_PATH,
      );
      expect(new Headers(call?.[1]?.headers).get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("AC-50.02 shows the documents message and opens the Document step", async () => {
      const message = APPLICATION_SUBMIT_MESSAGES.documentsIncomplete(5, 7);
      const incomplete = {
        status: 422,
        body: {
          code: "DOCUMENTS_INCOMPLETE",
          message,
          details: [{ field: "documents", code: "DOCUMENTS_INCOMPLETE", message, section: "documents" }],
          correlationId: "c-1",
        },
      };
      await submitWith(incomplete);

      await expectStep("Document");
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("AC-50.03 shows the required fields message and marks Personal with an error", async () => {
      const message = APPLICATION_SUBMIT_MESSAGES.incompleteApplication;
      const incomplete = {
        status: 422,
        body: {
          code: "INCOMPLETE_APPLICATION",
          message,
          details: [{ field: "education", code: "REQUIRED", message: "This field is required", section: "personal" }],
          correlationId: "c-1",
        },
      };
      await submitWith(incomplete);

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(step("Personal")).toHaveAttribute("data-error", "true");
      expect(step("Occupation")).not.toHaveAttribute("data-error");
    });

    it("closes the submit confirmation without submitting on No", async () => {
      const fetchSpy = await openStep("emergency-contact");
      await fillContact();
      clickButton("Submit");
      const dialog = await screen.findByRole("dialog", { name: "Submit" });

      fireEvent.click(within(dialog).getByRole("button", { name: "No" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(fetchSpy.mock.calls.some(([input]) => String(input) === SUBMIT_PATH)).toBe(false);
    });
  },
  FLOW_TIMEOUT_MS,
);
