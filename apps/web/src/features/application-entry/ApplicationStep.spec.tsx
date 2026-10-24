import { APPLICATION_SECTION_MESSAGES, insuranceListResponseMock } from "@cikal/contracts";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeStep,
  choose,
  clickButton,
  draftCreated,
  entryRoutes,
  fillApplicationStep,
  kta,
  rejected,
  sentBody,
  step,
  type,
} from "../../test/application-entry";
import { renderApp, stubApi } from "../../test/render-app";

const REQUIRED = APPLICATION_SECTION_MESSAGES.required;
const CREATE_DRAFT = "/api/v1/applications";

const fieldError = (label: string) =>
  screen
    .getByLabelText(new RegExp(`^${label}\\*?$`))
    .closest("div.flex-col")
    ?.querySelector("p.text-error");

/** Alur lewat SPA utuh mengisi puluhan field; batas waktu dilonggarkan untuk runner CI yang sibuk. */
const FLOW_TIMEOUT_MS = 15_000;

describe(
  "New Application - Application",
  () => {
    afterEach(() => vi.restoreAllMocks());

    it("AC-39.01 saves the Application step with Next and shows Personal with Application completed", async () => {
      const fetchSpy = stubApi(entryRoutes({ "POST /api/v1/applications": draftCreated }));
      renderApp("/applications/new");
      await fillApplicationStep();

      clickButton("Next");

      expect(await screen.findByRole("form", { name: "Personal" })).toBeInTheDocument();
      expect(activeStep()).toHaveTextContent("Personal");
      expect(step("Application")).toHaveAttribute("data-completed", "true");
      expect(step("Personal")).not.toHaveAttribute("data-completed");
      expect(screen.getByLabelText(/^Full Name\*?$/)).toHaveValue("Rudi Hartono");
      expect(sentBody(fetchSpy, "POST", CREATE_DRAFT)).toEqual({
        application: {
          applicationType: "NTB",
          segment: "MIKRO",
          productCategory: "NON_COLLATERAL",
          productId: kta?.id,
          tenorProposed: 36,
          requestedLimit: "20000000.00",
          insuranceId: insuranceListResponseMock.data[0]?.id,
        },
        personal: {
          idType: "KTP",
          idCardNumber: "3273011402900001",
          fullName: "Rudi Hartono",
          fullNameId: "RUDI HARTONO",
        },
        strict: true,
      });
    });

    it("AC-39.02 shows This field is required under each empty required field and stays on Application", async () => {
      const fieldsRequired = rejected(400, "VALIDATION_FAILED", "Please complete all required fields", [
        ["productId", REQUIRED],
        ["requestedLimit", REQUIRED],
      ]);
      stubApi(entryRoutes({ "POST /api/v1/applications": fieldsRequired }));
      renderApp("/applications/new");
      await screen.findByRole("form", { name: "Application" });
      await choose("Application Type", "NTB");

      clickButton("Next");

      expect(await screen.findAllByText(REQUIRED)).toHaveLength(2);
      expect(fieldError("Product")).toHaveTextContent(REQUIRED);
      expect(fieldError("Requested Limit")).toHaveTextContent(REQUIRED);
      expect(activeStep()).toHaveTextContent("Application");
    });

    it.each([
      ["TRM_APP_001", "4.999.999", "36", "LIMIT_OUT_OF_RANGE", "requestedLimit", "Requested Limit"],
      ["TRM_APP_004", "300.000.001", "36", "LIMIT_OUT_OF_RANGE", "requestedLimit", "Requested Limit"],
      ["TRM_APP_005", "20.000.000", "5", "TENOR_OUT_OF_RANGE", "tenorProposed", "Tenor Proposed"],
      ["TRM_APP_008", "20.000.000", "61", "TENOR_OUT_OF_RANGE", "tenorProposed", "Tenor Proposed"],
    ])(
      "AC-39.03 %s shows the product range message under the field",
      async (_row, limit, tenor, code, field, label) => {
        const message =
          code === "LIMIT_OUT_OF_RANGE"
            ? APPLICATION_SECTION_MESSAGES.limitOutOfRange("5,000,000", "300,000,000")
            : APPLICATION_SECTION_MESSAGES.tenorOutOfRange(6, 60);
        stubApi(entryRoutes({ "POST /api/v1/applications": rejected(422, code, message, [[field, message]]) }));
        renderApp("/applications/new");
        await fillApplicationStep({ requestedLimit: limit, tenorProposed: tenor });

        clickButton("Next");

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(fieldError(label)).toHaveTextContent(message);
        expect(activeStep()).toHaveTextContent("Application");
      },
    );

    it.each([
      ["TRM_APP_002", "5.000.000", "36"],
      ["TRM_APP_003", "300.000.000", "36"],
      ["TRM_APP_006", "20.000.000", "6"],
      ["TRM_APP_007", "20.000.000", "60"],
    ])("AC-39.03 %s continues to Personal", async (_row, limit, tenor) => {
      stubApi(entryRoutes({ "POST /api/v1/applications": draftCreated }));
      renderApp("/applications/new");
      await fillApplicationStep({ requestedLimit: limit, tenorProposed: tenor });

      clickButton("Next");

      expect(await screen.findByRole("form", { name: "Personal" })).toBeInTheDocument();
    });

    it("AC-97.04 shows the current KTA interest rate read-only after the product is chosen", async () => {
      stubApi(entryRoutes());
      renderApp("/applications/new");
      await screen.findByRole("form", { name: "Application" });
      const rate = screen.getByLabelText("Interest Rate");
      expect(rate).toHaveValue("");

      await choose("Product Category", "Non Collateral Loan");
      await choose("Product", "KTA");

      expect(rate).toHaveValue("14% p.a.");
      expect(rate).toHaveAttribute("readonly");
    });

    it("AC-39.04 discards the filled fields on Back and OK, and opens Application List without saving", async () => {
      const fetchSpy = stubApi(entryRoutes());
      renderApp("/applications/new");
      await screen.findByRole("form", { name: "Application" });
      await choose("Application Type", "NTB");
      type("Full Name", "Rudi Hartono");

      clickButton("Back");
      const dialog = screen.getByRole("dialog", { name: "Back" });
      expect(dialog).toHaveTextContent("Unsaved data will be lost. Continue?");
      within(dialog).getByRole("button", { name: "OK" }).click();

      expect(await screen.findByRole("heading", { name: "Application List" })).toBeInTheDocument();
      expect(await screen.findByText("20102026KTA0000013")).toBeInTheDocument();
      expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    });

    it("AC-39.04 keeps the filled fields when the Back confirmation is cancelled", async () => {
      stubApi(entryRoutes());
      renderApp("/applications/new");
      await screen.findByRole("form", { name: "Application" });
      type("Full Name", "Rudi Hartono");

      clickButton("Back");
      clickButton("Cancel");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByLabelText(/^Full Name\*?$/)).toHaveValue("Rudi Hartono");
    });

    it("returns from Personal to Application with the saved values and the identity locked", async () => {
      stubApi(entryRoutes({ "POST /api/v1/applications": draftCreated }));
      renderApp("/applications/new");
      await fillApplicationStep();
      clickButton("Next");
      await screen.findByRole("form", { name: "Personal" });

      clickButton("Back");
      within(screen.getByRole("dialog", { name: "Back" }))
        .getByRole("button", { name: "OK" })
        .click();

      expect(await screen.findByRole("form", { name: "Application" })).toBeInTheDocument();
      expect(screen.getByLabelText(/^Requested Limit\*?$/)).toHaveValue("20.000.000");
      expect(screen.getByLabelText(/^Full Name\*?$/)).toHaveAttribute("readonly");
      expect(step("Application")).toHaveAttribute("data-completed", "true");
    });
  },
  FLOW_TIMEOUT_MS,
);
