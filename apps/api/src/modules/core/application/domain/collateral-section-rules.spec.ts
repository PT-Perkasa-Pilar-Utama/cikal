import { collateralSectionInputSchema } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import {
  allowedCollateralTypes,
  type CollateralRuleContext,
  collateralSectionError,
} from "./collateral-section-rules.js";

const ADDRESS = {
  address: "Jl. Soekarno Hatta 20",
  provinceCode: "32",
  cityCode: "32.73",
  districtCode: "32.73.01",
  subDistrictCode: "32.73.01.1001",
  zipCode: "40111",
};

/** Kendaraan tahun 2021 seharga 180 juta (AC-46.01). */
const vehicle = (overrides: Record<string, unknown> = {}) =>
  collateralSectionInputSchema.parse({
    collateralType: "VEHICLE",
    vehicleType: "MOBIL",
    vehicleBrand: "Toyota",
    vehicleModel: "Avanza",
    vehicleYear: 2021,
    vehiclePrice: "180000000.00",
    vehicleColor: "Hitam",
    machineNumber: "1NRX123456",
    frameNumber: "MHKA1BA1JKK123456",
    bpkbNumber: "P01234567",
    policeNumber: "D 1234 ABC",
    address: ADDRESS,
    ...overrides,
  });

const context = (overrides: Partial<CollateralRuleContext> = {}): CollateralRuleContext => ({
  currentYear: 2026,
  collateralTypes: ["VEHICLE", "CERTIFICATE"],
  ...overrides,
});

describe("collateral section rules", () => {
  it("AC-46.01 accepts complete vehicle collateral", () => {
    expect(collateralSectionError(vehicle(), context())).toBeNull();
  });

  it("AC-46.02 limits a KPR product configured with CERTIFICATE to certificates", () => {
    expect(allowedCollateralTypes("COLLATERAL", ["CERTIFICATE"])).toEqual(["CERTIFICATE"]);
    expect(collateralSectionError(vehicle(), context({ collateralTypes: ["CERTIFICATE"] }))).toMatchObject({
      code: "COLLATERAL_TYPE_NOT_ALLOWED",
      status: 422,
      message: "Selected collateral type is not available for this product",
      details: [{ field: "collateralType" }],
    });
  });

  it("AC-46.03 accepts a pension decree for a Pension product", () => {
    const decree = collateralSectionInputSchema.parse({
      collateralType: "PENSION_DECREE",
      decreeNumber: "SK-123/2020",
      decreeDate: "2020-05-01",
    });

    expect(allowedCollateralTypes("PENSION", ["VEHICLE", "CERTIFICATE"])).toEqual(["PENSION_DECREE"]);
    expect(collateralSectionError(decree, context({ collateralTypes: ["PENSION_DECREE"] }))).toBeNull();
  });

  it("AC-46.04 rejects a vehicle year later than the current year", () => {
    expect(collateralSectionError(vehicle({ vehicleYear: 2027 }), context())).toMatchObject({
      code: "VEHICLE_YEAR_IN_FUTURE",
      status: 422,
      message: "Vehicle year must not be later than 2026",
      details: [{ field: "vehicleYear" }],
    });
  });

  it("AC-46.05 allows no collateral type for a Non Collateral product", () => {
    expect(allowedCollateralTypes("NON_COLLATERAL", ["VEHICLE", "CERTIFICATE"])).toEqual([]);
  });

  it("AC-46.06 marks empty Frame Number and BPKB Number as required", () => {
    const error = collateralSectionError(vehicle({ frameNumber: undefined, bpkbNumber: undefined }), context());

    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.details.map((detail) => [detail.field, detail.message])).toEqual([
      ["frameNumber", "This field is required"],
      ["bpkbNumber", "This field is required"],
    ]);
  });

  it("requires certificate details and address for a certificate", () => {
    const certificate = collateralSectionInputSchema.parse({ collateralType: "CERTIFICATE" });

    expect(collateralSectionError(certificate, context())?.details.map((detail) => detail.field)).toEqual([
      "certificateType",
      "certificateNumber",
      "surfaceArea",
      "address.address",
      "address.provinceCode",
      "address.cityCode",
      "address.districtCode",
      "address.subDistrictCode",
      "address.zipCode",
    ]);
  });
});
