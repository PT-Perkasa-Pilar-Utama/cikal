import { APPLICATION_SECTION_MESSAGES } from "@cikal/contracts";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  choose,
  clickButton,
  expectStep,
  FLOW_TIMEOUT_MS,
  fieldError,
  rejected,
  sentBody,
  type,
} from "../../test/application-entry";
import { openStep, SECTIONS_PATH, sectionSaved, stepRoutes } from "../../test/application-steps";

const SAVE_OCCUPATION = `${SECTIONS_PATH}/occupation?strict=true`;
const COMPANY = "Company Info";

/** Data pekerjaan karyawan AC-44.01. */
async function fillEmployee(income = "8.000.000") {
  await choose("Source of Income", "Bekerja");
  await choose("Occupation", "Karyawan Swasta");
  await choose("Industry of Profession", "Perdagangan");
  type("Tenure at Current Job (Years)", "4");
  type("Monthly Income Allowance", income);
  type("Company Name", "PT Maju Jaya");
  type("Company Phone Number", "0215551234");
  type("Company Address", "Jl. Sudirman No. 1", COMPANY);
  await choose("Province", "DKI JAKARTA", COMPANY);
  await choose("City", "KOTA JAKARTA PUSAT", COMPANY);
}

describe(
  "New Application - Occupation",
  () => {
    afterEach(() => vi.restoreAllMocks());

    it("AC-44.01 saves the employee occupation with Next and shows the next step for the product", async () => {
      const fetchSpy = await openStep("occupation");
      expect(screen.getByLabelText(/^Monthly Income Allowance\*?$/)).toBeRequired();
      await fillEmployee();

      clickButton("Next");

      await expectStep("Document");
      expect(sentBody(fetchSpy, "PUT", SAVE_OCCUPATION)).toEqual({
        sourceOfIncome: "001",
        occupation: "001",
        industryOfProfession: "001",
        tenureAtCurrentJob: "4",
        monthlyIncomeAllowance: "8000000.00",
        company: {
          name: "PT Maju Jaya",
          phoneNumber: "0215551234",
          address: "Jl. Sudirman No. 1",
          provinceCode: "31",
          cityCode: "3171",
        },
      });
    });

    it("AC-44.02 shows the income message under Monthly Income Allowance for 0", async () => {
      const message = APPLICATION_SECTION_MESSAGES.invalidIncome;
      const routes = stepRoutes({
        [`PUT ${SAVE_OCCUPATION}`]: rejected(422, "INVALID_INCOME", message, [["monthlyIncomeAllowance", message]]),
      });
      const fetchSpy = await openStep("occupation", routes);
      await fillEmployee("0");

      clickButton("Next");

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(fieldError("Monthly Income Allowance")).toHaveTextContent(message);
      await expectStep("Occupation");
      expect(sentBody(fetchSpy, "PUT", SAVE_OCCUPATION)).toMatchObject({ monthlyIncomeAllowance: "0.00" });
    });

    it("AC-44.03 continues without income and tenure for a Pension product", async () => {
      const routes = stepRoutes({
        "GET /api/v1/products/available?productCategory=PENSION": { status: 200, body: { data: [] } },
      });
      const fetchSpy = await openStep("occupation", routes, () => choose("Product Category", "Pension Credit"));
      expect(screen.getByLabelText(/^Monthly Income Allowance\*?$/)).not.toBeRequired();
      expect(screen.getByLabelText(/^Tenure at Current Job \(Years\)\*?$/)).not.toBeRequired();
      await choose("Source of Income", "Pensiun");

      clickButton("Next");

      await expectStep("Document");
      const body = sentBody(fetchSpy, "PUT", SAVE_OCCUPATION);
      expect(body).not.toHaveProperty("monthlyIncomeAllowance");
      expect(body).not.toHaveProperty("tenureAtCurrentJob");
      expect(screen.queryByText(APPLICATION_SECTION_MESSAGES.required)).not.toBeInTheDocument();
    });

    it("AC-44.04 shows the self-employed message under Occupation for a KUR product", async () => {
      const message = APPLICATION_SECTION_MESSAGES.occupationNotEligible;
      await openStep(
        "occupation",
        stepRoutes({
          [`PUT ${SAVE_OCCUPATION}`]: rejected(422, "OCCUPATION_NOT_ELIGIBLE", message, [["occupation", message]]),
        }),
      );
      await fillEmployee();

      clickButton("Next");

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(fieldError("Occupation")).toHaveTextContent(message);
    });

    it("saves the occupation as a draft and stays on Occupation", async () => {
      const message = "Application saved as draft. Loan ID: 20102026KTA0000013";
      const routes = stepRoutes({
        [`PUT ${SECTIONS_PATH}/occupation?strict=false`]: sectionSaved("occupation", "documents", message),
      });
      const fetchSpy = await openStep("occupation", routes);
      await choose("Occupation", "Wiraswasta");

      clickButton("Save as Draft");

      expect(await screen.findByText(message)).toBeInTheDocument();
      await expectStep("Occupation");
      expect(sentBody(fetchSpy, "PUT", `${SECTIONS_PATH}/occupation?strict=false`)).toMatchObject({
        occupation: "005",
      });
    });
  },
  FLOW_TIMEOUT_MS,
);
