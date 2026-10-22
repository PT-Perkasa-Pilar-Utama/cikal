import {
  type ProductCreateRequest,
  type ProductData,
  type ProductUpdateRequest,
  productDataSchema,
} from "@cikal/contracts";
import { Decimal } from "decimal.js";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** Kode produk 1 s.d. 5 huruf atau angka (api-specs 08 §8.3 langkah 1, Asumsi A-24). */
const PRODUCT_CODE_PATTERN = /^[A-Za-z0-9]{1,5}$/;
const MONEY_SCALE = 2;
const PERCENT_SCALE = 4;

/** Kode error produk dan pesan persis AC (api-specs 08 §8.3, §8.4). */
const PRODUCT_ERRORS = {
  INVALID_PRODUCT_CODE: { status: 422, message: "Product code must be 1 to 5 letters or digits" },
  INVALID_PLAFOND_RANGE: { status: 422, message: "Maximal plafond must be greater than minimal plafond" },
  AUTO_APPROVAL_LIMIT_EXCEEDED: { status: 422, message: "Limit auto approval must not exceed maximal plafond" },
  PRODUCT_CODE_EXISTS: { status: 409, message: "Product code already exists" },
  NO_CHANGES: { status: 422, message: "No changes to submit" },
} as const;

export type ProductErrorCode = keyof typeof PRODUCT_ERRORS;

export function productError(code: ProductErrorCode): DomainError {
  return new DomainError(code, PRODUCT_ERRORS[code].message, PRODUCT_ERRORS[code].status);
}

/** Pesan memuat nilai `CORE_MAX_TENOR_MONTHS` tenant (AC-20.07). */
export function tenorLimitError(coreMaxTenorMonths: number): DomainError {
  return new DomainError(
    "TENOR_EXCEEDS_CORE_LIMIT",
    `Maximum tenor must not exceed core banking limit (${coreMaxTenorMonths} months)`,
    422,
  );
}

export const productCodeChangedError = (): DomainError =>
  new DomainError("BUSINESS_RULE_VIOLATION", "Product code cannot be changed", 422);

export const money = (value: string): string => new Decimal(value).toFixed(MONEY_SCALE);
export const percent = (value: string): string => new Decimal(value).toFixed(PERCENT_SCALE);
const optional = <T, R>(value: T | undefined, map: (value: T) => R): R | null =>
  value === undefined ? null : map(value);

/**
 * Body POST atau PUT menjadi data produk lengkap untuk ChangeRequest: kode huruf besar (api-specs 08 §8.3),
 * default biaya `0`, field kosong `null`, dan angka desimal berskala tetap sehingga perbandingan dengan data
 * aktif tidak tertipu penulisan seperti `5000000.0`.
 */
export function toProductData(request: ProductCreateRequest | ProductUpdateRequest): ProductData {
  return {
    productCode: request.productCode.toUpperCase(),
    productName: request.productName,
    productCategory: request.productCategory,
    interestType: request.interestType,
    contractType: request.contractType ?? null,
    minPlafond: money(request.minPlafond),
    maxPlafond: money(request.maxPlafond),
    minTenor: request.minTenor,
    maxTenor: request.maxTenor,
    minAge: request.minAge,
    maxAge: request.maxAge,
    maxAgeAtMaturityMonth: request.maxAgeAtMaturityMonth ?? null,
    dbrMax: percent(request.dbrMax),
    dsr: optional(request.dsr, percent),
    multipleSalaryDbr: optional(request.multipleSalaryDbr, percent),
    adminFee: money(request.adminFee ?? "0"),
    provisionFee: percent(request.provisionFee ?? "0"),
    salesFee: optional(request.salesFee, money),
    limitAutoApproval: money(request.limitAutoApproval ?? "0"),
    scoringApproval: request.scoringApproval ?? null,
    isPaylater: request.isPaylater ?? null,
    validFrom: request.validFrom,
    validTo: request.validTo ?? null,
    isActive: "isActive" in request ? request.isActive : true,
  };
}

/**
 * Aturan produk tanpa I/O, berurutan seperti api-specs 08 §8.3 langkah 1 s.d. 4; `null` bila lolos. Keunikan
 * kode (langkah 5) butuh database dan diperiksa use case.
 */
export function productRuleError(data: ProductData, coreMaxTenorMonths: number): DomainError | null {
  if (!PRODUCT_CODE_PATTERN.test(data.productCode)) return productError("INVALID_PRODUCT_CODE");
  if (new Decimal(data.maxPlafond).lte(data.minPlafond)) return productError("INVALID_PLAFOND_RANGE");
  if (new Decimal(data.limitAutoApproval).gt(data.maxPlafond)) return productError("AUTO_APPROVAL_LIMIT_EXCEEDED");
  if (data.maxTenor > coreMaxTenorMonths) return tenorLimitError(coreMaxTenorMonths);
  if (data.validTo !== null && data.validTo < data.validFrom) return DomainError.standard("INVALID_DATE_RANGE");
  if (data.productCategory === "SYARIAH" && data.contractType === null) {
    return DomainError.standard("VALIDATION_FAILED", undefined, [
      { field: "contractType", code: "REQUIRED", message: "This field is required" },
    ]);
  }
  return null;
}

/** Nilai parameter `CORE_MAX_TENOR_MONTHS` bertipe NUMBER (data dictionary). */
export function parseTenorLimit(value: string | null): number {
  const months = Number(value);
  if (value === null || !Number.isInteger(months)) {
    throw new Error(`CORE_MAX_TENOR_MONTHS must be an integer, got ${String(value)}`);
  }
  return months;
}

/** Data usulan sama dengan data aktif (`422 NO_CHANGES`, api-specs 08 §8.4). */
export function sameProductData(current: ProductData, proposed: ProductData): boolean {
  return productDataSchema.keyof().options.every((key) => current[key] === proposed[key]);
}
