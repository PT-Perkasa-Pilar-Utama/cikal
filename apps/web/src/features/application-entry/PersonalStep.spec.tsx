import { APPLICATION_DRAFT_MESSAGES, APPLICATION_SECTION_MESSAGES, sectionSaveResponseMock } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeStep,
  choose,
  clickButton,
  DRAFT_ID,
  draftCreated,
  entryRoutes,
  expectStep,
  FLOW_TIMEOUT_MS,
  fieldError,
  fillApplicationStep,
  rejected,
  sentBody,
  step,
  type,
} from "../../test/application-entry";
import { renderApp, type StubResponse, stubApi } from "../../test/render-app";

const SAVE_PERSONAL = `/api/v1/applications/${DRAFT_ID}/sections/personal?strict=true`;
const saved: StubResponse = { status: 200, body: sectionSaveResponseMock };
const ID_ADDRESS = "ID Address";
const RESIDENCE = "Residence Address";

/** Buka step Personal lewat "Next" di step Application; `personal` adalah jawaban simpan section Personal. */
async function openPersonal(personal: StubResponse = saved) {
  const fetchSpy = stubApi(
    entryRoutes({ "POST /api/v1/applications": draftCreated, [`PUT ${SAVE_PERSONAL}`]: personal }),
  );
  renderApp("/applications/new");
  await fillApplicationStep();
  clickButton("Next");
  await screen.findByRole("form", { name: "Personal" });
  return fetchSpy;
}

/** Alamat KTP Gambir, Jakarta Pusat lewat dropdown berjenjang. */
async function fillIdAddress() {
  type("Address", "Jl. Merdeka No. 10", ID_ADDRESS);
  await choose("Province", "DKI JAKARTA", ID_ADDRESS);
  await choose("City", "KOTA JAKARTA PUSAT", ID_ADDRESS);
  await choose("District", "GAMBIR", ID_ADDRESS);
  await choose("Sub District", "GAMBIR", ID_ADDRESS);
}

/** Data pribadi AC-40.01; `dateOfBirth` dan `npwp` bisa diganti per AC. */
async function fillPersonal(values: { dateOfBirth?: string; npwp?: string } = {}) {
  type("Place of Birth", "Bandung");
  type("Date of Birth", values.dateOfBirth ?? "1990-02-14");
  await choose("Gender", "Laki-laki");
  await choose("Religion", "Islam");
  await choose("Nationality", "WNI");
  await choose("Education", "S1");
  await choose("Marital", "Belum Kawin");
  type("Mother Maiden Name", "Siti");
  type("ID Date Issued", "2020-01-10");
  if (values.npwp) type("NPWP Number", values.npwp);
  type("Mobile Number", "081298765432");
  await fillIdAddress();
  fireEvent.click(screen.getByRole("checkbox", { name: "Same as ID Address" }));
}

const ktpAddress = {
  address: "Jl. Merdeka No. 10",
  provinceCode: "31",
  cityCode: "3171",
  districtCode: "317101",
  subDistrictCode: "3171011001",
  zipCode: "10110",
};

describe(
  "New Application - Personal",
  () => {
    afterEach(() => vi.restoreAllMocks());

    it("AC-40.01 saves the personal data with Next and shows Occupation for Belum Kawin", async () => {
      const fetchSpy = await openPersonal();
      await fillPersonal();

      clickButton("Next");

      await expectStep("Occupation");
      expect(step("Personal")).toHaveAttribute("data-completed", "true");
      expect(sentBody(fetchSpy, "PUT", SAVE_PERSONAL)).toEqual({
        fullName: "Rudi Hartono",
        fullNameId: "RUDI HARTONO",
        placeOfBirth: "Bandung",
        dateOfBirth: "1990-02-14",
        gender: "L",
        religion: "ISLAM",
        nationality: "WNI",
        education: "S1",
        marital: "001",
        motherMaidenName: "Siti",
        idType: "KTP",
        idCardNumber: "3273011402900001",
        idIssuedDate: "2020-01-10",
        mobileNumber: "081298765432",
        addresses: { id: ktpAddress, residence: { sameAsId: true } },
        consentGiven: false,
      });
    });

    it("AC-23.04 lists only the cities of the chosen province in the City dropdown", async () => {
      await openPersonal();

      await choose("Province", "DKI JAKARTA", ID_ADDRESS);

      const city = within(screen.getByRole("group", { name: ID_ADDRESS })).getByLabelText(/^City\*?$/);
      expect(await within(city).findByRole("option", { name: "KOTA JAKARTA PUSAT" })).toBeInTheDocument();
      expect(within(city).getByRole("option", { name: "KOTA JAKARTA UTARA" })).toBeInTheDocument();
      expect(within(city).queryByRole("option", { name: "KOTA BANDUNG" })).not.toBeInTheDocument();
    });

    it("AC-40.02 shows the 16-digit message under ID Card Number", async () => {
      const message = APPLICATION_DRAFT_MESSAGES.idCardNumber;
      await openPersonal(
        rejected(400, "VALIDATION_FAILED", "Please complete all required fields", [["idCardNumber", message]]),
      );
      type("ID Card Number", "327301140290000");

      clickButton("Next");

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(fieldError("ID Card Number")).toHaveTextContent(message);
      expect(activeStep()).toHaveTextContent("Personal");
    });

    it("AC-40.03 shows the product age range message under Date of Birth and stays on Personal", async () => {
      const message = APPLICATION_SECTION_MESSAGES.ageOutOfRange(21, 55);
      const fetchSpy = await openPersonal(rejected(422, "AGE_OUT_OF_RANGE", message, [["dateOfBirth", message]]));
      await fillPersonal({ dateOfBirth: "2005-10-21" });

      clickButton("Next");

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(fieldError("Date of Birth")).toHaveTextContent(message);
      expect(activeStep()).toHaveTextContent("Personal");
      expect(sentBody(fetchSpy, "PUT", SAVE_PERSONAL)).toMatchObject({ dateOfBirth: "2005-10-21" });
    });

    it("AC-40.04 continues to the next step for an applicant aged exactly 21", async () => {
      const fetchSpy = await openPersonal();
      await fillPersonal({ dateOfBirth: "2005-10-20" });

      clickButton("Next");

      await expectStep("Occupation");
      expect(sentBody(fetchSpy, "PUT", SAVE_PERSONAL)).toMatchObject({ dateOfBirth: "2005-10-20" });
    });

    it("AC-40.05 shows the NPWP message under NPWP Number for a limit above 50,000,000", async () => {
      const message = APPLICATION_SECTION_MESSAGES.npwpRequired("50,000,000");
      await openPersonal(rejected(422, "NPWP_REQUIRED", message, [["npwpNumber", message]]));
      await fillPersonal();

      clickButton("Next");

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(fieldError("NPWP Number")).toHaveTextContent(message);
    });

    it("AC-40.06 sends no NPWP when it is left empty and continues", async () => {
      const fetchSpy = await openPersonal();
      await fillPersonal();

      clickButton("Next");

      await expectStep("Occupation");
      expect(sentBody(fetchSpy, "PUT", SAVE_PERSONAL)).not.toHaveProperty("npwpNumber");
    });

    it("AC-40.07 copies every ID address field to Residence Address and makes them read-only", async () => {
      await openPersonal();
      await fillIdAddress();

      fireEvent.click(screen.getByRole("checkbox", { name: "Same as ID Address" }));

      const residence = within(screen.getByRole("group", { name: RESIDENCE }));
      expect(residence.getByLabelText(/^Address\*?$/)).toHaveValue("Jl. Merdeka No. 10");
      expect(residence.getByLabelText(/^Address\*?$/)).toHaveAttribute("readonly");
      for (const [label, value] of [
        ["Province", "31"],
        ["City", "3171"],
        ["District", "317101"],
        ["Sub District", "3171011001"],
      ]) {
        expect(residence.getByLabelText(new RegExp(`^${label}$`))).toHaveValue(value);
        expect(residence.getByLabelText(new RegExp(`^${label}$`))).toBeDisabled();
      }
      expect(residence.getByLabelText("Zip Code")).toHaveValue("10110");
    });

    it("AC-40.08 sends the applicant consent when the checkbox is ticked", async () => {
      const fetchSpy = await openPersonal();
      await fillPersonal();
      fireEvent.click(
        screen.getByRole("checkbox", { name: "Applicant consents to credit checking and personal data processing" }),
      );

      clickButton("Next");

      await expectStep("Occupation");
      expect(sentBody(fetchSpy, "PUT", SAVE_PERSONAL)).toMatchObject({ consentGiven: true });
    });
  },
  FLOW_TIMEOUT_MS,
);
