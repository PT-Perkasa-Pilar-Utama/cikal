import {
  APPLICATION_SECTION_MESSAGES,
  type ApplicationFormResponse,
  applicationFormResponseMock,
  type CollateralType,
  type FormSection,
  type SavableSection,
  type SectionSaveResponse,
  sectionSaveResponseMock,
} from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  choose,
  clickButton,
  DRAFT_ID,
  expectStep,
  FLOW_TIMEOUT_MS,
  fieldError,
  rejected,
  sentBody,
  type,
} from "../../test/application-entry";
import { openStep, SECTIONS_PATH, stepRoutes } from "../../test/application-steps";
import type { ApiRoutes, StubResponse } from "../../test/render-app";

const ALL_STEPS: FormSection[] = [
  "application",
  "personal",
  "spouse",
  "occupation",
  "business",
  "collateral",
  "documents",
  "emergency-contact",
];
const FORM_PATH = `/api/v1/applications/${DRAFT_ID}/form`;

/** Jawaban "Next" dengan `steps[]` Kredit Agunan, Kawin, Wiraswasta (TRM_STP_003) kecuali `steps` diberikan. */
function saved(section: SavableSection, nextSection: FormSection | null, steps = ALL_STEPS): StubResponse {
  return {
    status: 200,
    body: {
      data: { ...sectionSaveResponseMock.data, savedSection: section, nextSection, steps },
    } satisfies SectionSaveResponse,
  };
}

const options = (...values: [string, string][]): StubResponse => ({
  status: 200,
  body: { data: values.map(([paramId, paramValue]) => ({ paramId, paramValue, isActive: true })) },
});

function collateralTypes(types: CollateralType[]): StubResponse {
  return {
    status: 200,
    body: {
      data: { ...applicationFormResponseMock.data, steps: ALL_STEPS, collateralTypes: types },
    } satisfies ApplicationFormResponse,
  };
}

function conditionalRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return stepRoutes({
    [`PUT ${SECTIONS_PATH}/personal?strict=true`]: saved("personal", "spouse"),
    [`PUT ${SECTIONS_PATH}/spouse?strict=true`]: saved("spouse", "occupation"),
    [`PUT ${SECTIONS_PATH}/occupation?strict=true`]: saved("occupation", "business"),
    [`PUT ${SECTIONS_PATH}/business?strict=true`]: saved("business", "collateral"),
    [`PUT ${SECTIONS_PATH}/collateral?strict=true`]: saved("collateral", "documents"),
    [`GET ${FORM_PATH}`]: collateralTypes(["VEHICLE", "CERTIFICATE"]),
    "GET /api/v1/parameters/Prenuptial%20Agreement/options": options(["Y", "Yes"], ["N", "No"]),
    "GET /api/v1/parameters/Source%20of%20Fund/options": options(["001", "Gaji"]),
    "GET /api/v1/parameters/Business%20Field/options": options(["001", "Perdagangan Eceran"]),
    "GET /api/v1/parameters/Object%20Type/options": options(["MOBIL", "Mobil"]),
    "GET /api/v1/parameters/Certificate%20Type/options": options(["SHM", "SHM"]),
    ...extra,
  });
}

/** Data pasangan AC-43.01. */
async function fillSpouse(idNumber = "3273015506920002") {
  type("Spouse Full Name", "Sri Wahyuni");
  type("Spouse ID Number", idNumber);
  type("Spouse Date of Birth", "1992-06-15");
  await choose("Prenuptial Agreement", "No");
  await choose("Spouse Occupation", "Karyawan Swasta");
  type("Spouse Monthly Income", "6.000.000");
}

/** Data usaha AC-45.01 dengan tanggal mulai `launchDate`. */
async function fillBusiness(launchDate = "2018-03-01") {
  type("Business Name", "Toko Sumber Rejeki");
  await choose("Business Field", "Perdagangan Eceran");
  type("Annual Sales", "600.000.000");
  type("Business Launch Date", launchDate);
}

/** Kendaraan AC-46.01 tanpa alamat; API tiruan menerima field yang kosong. */
async function fillVehicle(year = "2021") {
  await choose("Collateral Type", "Kendaraan");
  await choose("Type", "Mobil");
  type("Brand", "Toyota");
  type("Model", "Avanza");
  type("Year of Vehicle Release", year);
  type("Price", "180.000.000");
}

describe(
  "New Application - Spouse, Business, Collateral",
  () => {
    afterEach(() => vi.restoreAllMocks());

    it("AC-43.01 saves spouse data with Next and shows Occupation", async () => {
      const fetchSpy = await openStep("spouse", conditionalRoutes());
      await fillSpouse();

      clickButton("Next");

      await expectStep("Occupation");
      expect(sentBody(fetchSpy, "PUT", `${SECTIONS_PATH}/spouse?strict=true`)).toMatchObject({
        fullName: "Sri Wahyuni",
        idNumber: "3273015506920002",
        dateOfBirth: "1992-06-15",
        prenuptialAgreement: "N",
        occupation: "001",
        monthlyIncome: "6000000.00",
      });
    });

    it("AC-43.02 shows the spouse ID message under Spouse ID Number", async () => {
      const message = APPLICATION_SECTION_MESSAGES.spouseIdSameAsApplicant;
      const routes = conditionalRoutes({
        [`PUT ${SECTIONS_PATH}/spouse?strict=true`]: rejected(422, "SPOUSE_ID_SAME_AS_APPLICANT", message, [
          ["idNumber", message],
        ]),
      });
      await openStep("spouse", routes);
      await fillSpouse("3273011402900001");

      clickButton("Next");

      expect(await screen.findAllByText(message)).not.toHaveLength(0);
      expect(fieldError("Spouse ID Number")).toHaveTextContent(message);
      await expectStep("Spouse");
    });

    it("AC-43.04 asks before removing spouse data and drops the Spouse step", async () => {
      const routes = conditionalRoutes();
      const fetchSpy = await openStep("occupation", routes);
      routes[`PUT ${SECTIONS_PATH}/personal?strict=true`] = saved(
        "personal",
        "occupation",
        ALL_STEPS.filter((section) => section !== "spouse"),
      );
      for (const previous of ["Spouse", "Personal"]) {
        clickButton("Back");
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "OK" }));
        await expectStep(previous);
      }
      await choose("Marital", "Belum Kawin");

      clickButton("Next");

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent("Spouse data will be removed. Continue?");
      fireEvent.click(within(dialog).getByRole("button", { name: "OK" }));
      await expectStep("Occupation");
      expect(sentBody(fetchSpy, "PUT", `${SECTIONS_PATH}/personal?strict=true`)).toMatchObject({ marital: "001" });
      expect(screen.queryByText("Spouse", { selector: "li" })).not.toBeInTheDocument();
    });

    it("AC-45.01 saves business data with Next and shows the next step for the product", async () => {
      const fetchSpy = await openStep("business", conditionalRoutes());
      await fillBusiness();

      clickButton("Next");

      await expectStep("Collateral");
      expect(sentBody(fetchSpy, "PUT", `${SECTIONS_PATH}/business?strict=true`)).toMatchObject({
        businessName: "Toko Sumber Rejeki",
        businessField: "001",
        annualSales: "600000000.00",
        businessLaunchDate: "2018-03-01",
      });
    });

    it("AC-45.02 shows the launch date message under Business Launch Date", async () => {
      const message = APPLICATION_SECTION_MESSAGES.businessLaunchInFuture;
      const routes = conditionalRoutes({
        [`PUT ${SECTIONS_PATH}/business?strict=true`]: rejected(422, "BUSINESS_LAUNCH_DATE_IN_FUTURE", message, [
          ["businessLaunchDate", message],
        ]),
      });
      await openStep("business", routes);
      await fillBusiness("2026-10-21");

      clickButton("Next");

      expect(await screen.findAllByText(message)).not.toHaveLength(0);
      expect(fieldError("Business Launch Date")).toHaveTextContent(message);
      await expectStep("Business");
    });

    it("AC-46.01 saves vehicle collateral with Next and shows Document", async () => {
      const fetchSpy = await openStep("collateral", conditionalRoutes());
      await fillVehicle();

      clickButton("Next");

      await expectStep("Document");
      expect(sentBody(fetchSpy, "PUT", `${SECTIONS_PATH}/collateral?strict=true`)).toMatchObject({
        collateralType: "VEHICLE",
        vehicleType: "MOBIL",
        vehicleYear: 2021,
        vehiclePrice: "180000000.00",
      });
    });

    it("AC-46.02 fills Collateral Type with Sertifikat only for KPR and shows the certificate forms", async () => {
      await openStep("collateral", conditionalRoutes({ [`GET ${FORM_PATH}`]: collateralTypes(["CERTIFICATE"]) }));

      const select = await screen.findByLabelText(/^Collateral Type\*?$/, { selector: "select" });

      await vi.waitFor(() => expect(select).toHaveValue("CERTIFICATE"));
      expect(within(select).queryByRole("option", { name: "Kendaraan" })).not.toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Certificate Details" })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Certificate Address" })).toBeInTheDocument();
    });

    it("AC-46.04 shows the vehicle year message under Year of Vehicle Release", async () => {
      const message = APPLICATION_SECTION_MESSAGES.vehicleYearInFuture(2026);
      const routes = conditionalRoutes({
        [`PUT ${SECTIONS_PATH}/collateral?strict=true`]: rejected(422, "VEHICLE_YEAR_IN_FUTURE", message, [
          ["vehicleYear", message],
        ]),
      });
      await openStep("collateral", routes);
      await fillVehicle("2027");

      clickButton("Next");

      expect(await screen.findAllByText(message)).not.toHaveLength(0);
      expect(fieldError("Year of Vehicle Release")).toHaveTextContent(message);
      await expectStep("Collateral");
    });
  },
  FLOW_TIMEOUT_MS,
);
