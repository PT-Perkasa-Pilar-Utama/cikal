import { applicationFormResponseMock, standardErrors } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAFT_ID, expectStep, FLOW_TIMEOUT_MS, step } from "../../test/application-entry";
import { stepRoutes } from "../../test/application-steps";
import { renderApp, stubApi } from "../../test/render-app";

const FORM = `GET /api/v1/applications/${DRAFT_ID}/form`;
const LOAN_ID = applicationFormResponseMock.data.loanId;

describe(
  "Application List - continue a draft",
  () => {
    afterEach(() => vi.restoreAllMocks());

    it("AC-49.05 opens the draft saved up to Occupation from its Loan ID with the earlier data filled", async () => {
      stubApi(stepRoutes({ [FORM]: { status: 200, body: applicationFormResponseMock } }));
      renderApp("/applications/drafts");

      fireEvent.click(await screen.findByRole("link", { name: LOAN_ID }));

      expect(await screen.findByRole("form", { name: "Occupation" })).toBeInTheDocument();
      await expectStep("Occupation");
      expect(screen.getByText(`Loan ID: ${LOAN_ID}`, { selector: "span" })).toBeInTheDocument();
      expect(step("Application")).toHaveAttribute("data-completed", "true");
      expect(step("Personal")).toHaveAttribute("data-completed", "true");

      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      fireEvent.click(within(screen.getByRole("dialog", { name: "Back" })).getByRole("button", { name: "OK" }));

      expect(await screen.findByRole("form", { name: "Personal" })).toBeInTheDocument();
      expect(screen.getByLabelText(/^Full Name\*?$/, { selector: "input" })).toHaveValue("Rudi Hartono");
      expect(screen.getByLabelText(/^Place of Birth\*?$/)).toHaveValue("Bandung");
      expect(screen.getByLabelText(/^Date of Birth\*?$/)).toHaveValue("1990-02-14");
      expect(screen.getByRole("checkbox", { name: "Same as ID Address" })).toBeChecked();
    });

    it("AC-64.02 AC-73.02 shows the return note above the form of a returned draft", async () => {
      const returned = {
        data: { ...applicationFormResponseMock.data, returnNote: "NPWP: Nama di NPWP tidak sesuai KTP" },
      };
      stubApi(stepRoutes({ [FORM]: { status: 200, body: returned } }));
      renderApp(`/applications/${DRAFT_ID}`);

      const note = await screen.findByRole("region", { name: "Return Note" });

      expect(note).toHaveTextContent("NPWP: Nama di NPWP tidak sesuai KTP");
      expect(note.compareDocumentPosition(screen.getByRole("form", { name: "Occupation" }))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it("AC-50.01 does not open a submitted application for editing", async () => {
      const submitted = { data: { ...applicationFormResponseMock.data, status: "ON_PROGRESS" } };
      stubApi(stepRoutes({ [FORM]: { status: 200, body: submitted } }));
      renderApp(`/applications/${DRAFT_ID}`);

      expect(await screen.findByText(standardErrors.INVALID_STATE.message)).toBeInTheDocument();
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  },
  FLOW_TIMEOUT_MS,
);
