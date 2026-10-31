import {
  APPLICATION_SECTION_MESSAGES,
  type CollateralSectionInput,
  type CollateralType,
  type ProductCategory,
} from "@cikal/contracts";
import type { DomainError } from "../../../../platform/http/domain-error.js";
import { fieldRuleError, requiredFieldsError } from "./section-errors.js";

/** Tahun berjalan dan jenis agunan yang boleh dipilih untuk produk. */
export interface CollateralRuleContext {
  currentYear: number;
  collateralTypes: readonly CollateralType[];
}

/**
 * Jenis agunan yang boleh dipilih (api-specs 12 §12.3): kategori `PENSION` hanya SK pensiun (AC-46.03), kategori
 * `COLLATERAL` mengikuti parameter produk `COLLATERAL_TYPES` (KPR hanya `CERTIFICATE`, AC-46.02), selain itu kosong.
 */
export function allowedCollateralTypes(
  productCategory: ProductCategory,
  configured: readonly string[],
): CollateralType[] {
  if (productCategory === "PENSION") return ["PENSION_DECREE"];
  if (productCategory !== "COLLATERAL") return [];
  const types: readonly CollateralType[] = ["VEHICLE", "CERTIFICATE"];
  return types.filter((type) => configured.includes(type));
}

const addressFields = ({ address }: CollateralSectionInput) => ({
  "address.address": address.address,
  "address.provinceCode": address.provinceCode,
  "address.cityCode": address.cityCode,
  "address.districtCode": address.districtCode,
  "address.subDistrictCode": address.subDistrictCode,
  "address.zipCode": address.zipCode,
});

/** Field wajib per jenis agunan (data dictionary, ApplicationCollateral). */
function typeFields(input: CollateralSectionInput): Record<string, unknown> {
  switch (input.collateralType) {
    case "VEHICLE":
      return {
        vehicleType: input.vehicleType,
        vehicleBrand: input.vehicleBrand,
        vehicleModel: input.vehicleModel,
        vehicleYear: input.vehicleYear,
        vehiclePrice: input.vehiclePrice,
        vehicleColor: input.vehicleColor,
        machineNumber: input.machineNumber,
        frameNumber: input.frameNumber,
        bpkbNumber: input.bpkbNumber,
        policeNumber: input.policeNumber,
        ...addressFields(input),
      };
    case "CERTIFICATE":
      return {
        certificateType: input.certificateType,
        certificateNumber: input.certificateNumber,
        surfaceArea: input.surfaceArea,
        ...addressFields(input),
      };
    case "PENSION_DECREE":
      return { decreeNumber: input.decreeNumber, decreeDate: input.decreeDate };
    case undefined:
      return {};
  }
}

/**
 * Aturan section Collateral mode strict (api-specs 12 §12.3): field wajib jenis agunan (AC-46.06), jenis agunan
 * yang boleh untuk produk, lalu tahun kendaraan tidak melebihi tahun berjalan (AC-46.04); `null` bila lolos.
 */
export function collateralSectionError(
  input: CollateralSectionInput,
  context: CollateralRuleContext,
): DomainError | null {
  const required = requiredFieldsError({ collateralType: input.collateralType, ...typeFields(input) });
  if (required) return required;
  if (input.collateralType && !context.collateralTypes.includes(input.collateralType)) {
    const message = APPLICATION_SECTION_MESSAGES.collateralTypeNotAllowed;
    return fieldRuleError("COLLATERAL_TYPE_NOT_ALLOWED", message, "collateralType");
  }
  if (input.collateralType === "VEHICLE" && (input.vehicleYear ?? 0) > context.currentYear) {
    const message = APPLICATION_SECTION_MESSAGES.vehicleYearInFuture(context.currentYear);
    return fieldRuleError("VEHICLE_YEAR_IN_FUTURE", message, "vehicleYear");
  }
  return null;
}
