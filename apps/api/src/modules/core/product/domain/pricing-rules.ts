import type { InterestType, ProductPricingData, ProductPricingUpdateRequest } from "@cikal/contracts";
import { Decimal } from "decimal.js";
import { DomainError, type ErrorDetail } from "../../../../platform/http/domain-error.js";
import { money, percent } from "./product-rules.js";

type SubProduct = ProductPricingData["subProducts"][number];

/** Produk pemilik pricing: tipe bunga menentukan field kondisional, tenor membatasi `tenorFixed` (api-specs 08 §8.6). */
export interface PricedProduct {
  productCode: string;
  productName: string;
  interestType: InterestType;
  maxTenor: number;
}

const REQUIRED = "This field is required";
const FLOATING_TYPES: readonly InterestType[] = ["FLOATING", "HYBRID"];

const PRICING_ERRORS = {
  PRICING_PERIOD_OVERLAP: "Pricing periods must not overlap",
  INVALID_APPROVER_RATE_RANGE: "Approver rate range must include the interest rate",
} as const;

const pricingError = (code: keyof typeof PRICING_ERRORS) => new DomainError(code, PRICING_ERRORS[code], 422);
const optional = (value: string | undefined, map: (value: string) => string) =>
  value === undefined ? null : map(value);

/**
 * Body PUT menjadi data pricing untuk ChangeRequest, urutan baris seperti di form agar path error per field
 * cocok. Kode dan nama produk ikut disimpan untuk nama baris di "Pending Product" (api-specs 07 §7.2).
 */
export function toPricingData(request: ProductPricingUpdateRequest, product: PricedProduct): ProductPricingData {
  const subProducts = request.subProducts.map((row) => ({
    interestRate: percent(row.interestRate),
    floatingRate: optional(row.floatingRate, percent),
    capRate: optional(row.capRate, percent),
    tenorFixed: row.tenorFixed ?? null,
    approverRateMin: optional(row.approverRateMin, percent),
    approverRateMax: optional(row.approverRateMax, percent),
    validFrom: row.validFrom,
    validTo: row.validTo ?? null,
  }));
  return {
    productCode: product.productCode,
    productName: product.productName,
    adminFee: money(request.adminFee),
    provisionFee: percent(request.provisionFee),
    salesFee: optional(request.salesFee, money),
    subProducts,
  };
}

/** Field wajib per tipe bunga dan batas nilai per baris (api-specs 08 §8.6 tabel input). */
function fieldErrors(row: SubProduct, index: number, product: PricedProduct): ErrorDetail[] {
  const field = (name: string) => `subProducts.${index}.${name}`;
  const errors: ErrorDetail[] = [];
  if (!new Decimal(row.interestRate).gt(0)) {
    errors.push({
      field: field("interestRate"),
      code: "OUT_OF_RANGE",
      message: "Interest rate must be greater than 0",
    });
  }
  if (FLOATING_TYPES.includes(product.interestType) && row.floatingRate === null) {
    errors.push({ field: field("floatingRate"), code: "REQUIRED", message: REQUIRED });
  }
  if (product.interestType === "CAPPED" && row.capRate === null) {
    errors.push({ field: field("capRate"), code: "REQUIRED", message: REQUIRED });
  }
  if (product.interestType === "HYBRID" && row.tenorFixed === null) {
    errors.push({ field: field("tenorFixed"), code: "REQUIRED", message: REQUIRED });
  }
  if (row.tenorFixed !== null && row.tenorFixed >= product.maxTenor) {
    errors.push({
      field: field("tenorFixed"),
      code: "OUT_OF_RANGE",
      message: "Fixed tenor must be less than maximum tenor",
    });
  }
  return errors;
}

/** Periode diurutkan menurut `validFrom`; `validTo` kosong berarti berlaku terus (AC-97.02). */
function overlaps(rows: readonly SubProduct[]): boolean {
  const sorted = [...rows].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  return sorted.some((row, index) => {
    const next = sorted[index + 1];
    return next !== undefined && (row.validTo === null || next.validFrom <= row.validTo);
  });
}

/** Rentang Approver yang diisi harus mencakup suku bunga baris itu (AC-97.03, grooming v2 R-19). */
function coversRate(row: SubProduct): boolean {
  const rate = new Decimal(row.interestRate);
  return (
    (row.approverRateMin === null || rate.gte(row.approverRateMin)) &&
    (row.approverRateMax === null || rate.lte(row.approverRateMax))
  );
}

/** Aturan pricing tanpa I/O, berurutan seperti api-specs 08 §8.6; `null` bila lolos. */
export function pricingRuleError(data: ProductPricingData, product: PricedProduct): DomainError | null {
  const details = data.subProducts.flatMap((row, index) => fieldErrors(row, index, product));
  if (details.length > 0) return DomainError.standard("VALIDATION_FAILED", undefined, details);
  if (data.subProducts.some((row) => row.validTo !== null && row.validTo < row.validFrom)) {
    return DomainError.standard("INVALID_DATE_RANGE");
  }
  if (overlaps(data.subProducts)) return pricingError("PRICING_PERIOD_OVERLAP");
  if (!data.subProducts.every(coversRate)) return pricingError("INVALID_APPROVER_RATE_RANGE");
  return null;
}
