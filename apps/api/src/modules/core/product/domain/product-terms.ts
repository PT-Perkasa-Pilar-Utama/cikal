import type { ProductData, ProductPricingData } from "@cikal/contracts";

type SubProductData = ProductPricingData["subProducts"][number];

/** SubProduct yang berlaku pada tanggal bisnis `date` (AC-97.02: periode tidak tumpang tindih). */
export function pricingOn<T extends Pick<SubProductData, "validFrom" | "validTo">>(
  rows: readonly T[],
  date: string,
): T | null {
  return rows.find((row) => row.validFrom <= date && (row.validTo === null || row.validTo >= date)) ?? null;
}

/**
 * Parameter produk dan pricing yang dikunci saat submit (grooming v1 A-36, AC-20.08), dengan kode variabel katalog
 * rumus (api-specs 09 §9.2, contoh `PRODUCT_DBR_MAX`). Nilai kosong tidak ikut.
 */
export function productTermVariables(product: ProductData, pricing: SubProductData | null): Record<string, string> {
  const terms: Record<string, string | number | null> = {
    PRODUCT_MIN_PLAFOND: product.minPlafond,
    PRODUCT_MAX_PLAFOND: product.maxPlafond,
    PRODUCT_MIN_TENOR: product.minTenor,
    PRODUCT_MAX_TENOR: product.maxTenor,
    PRODUCT_MIN_AGE: product.minAge,
    PRODUCT_MAX_AGE: product.maxAge,
    PRODUCT_MAX_AGE_AT_MATURITY_MONTH: product.maxAgeAtMaturityMonth,
    PRODUCT_DBR_MAX: product.dbrMax,
    PRODUCT_DSR: product.dsr,
    PRODUCT_MULTIPLE_SALARY_DBR: product.multipleSalaryDbr,
    PRODUCT_ADMIN_FEE: product.adminFee,
    PRODUCT_PROVISION_FEE: product.provisionFee,
    PRODUCT_SALES_FEE: product.salesFee,
    PRODUCT_LIMIT_AUTO_APPROVAL: product.limitAutoApproval,
    PRODUCT_INTEREST_TYPE: product.interestType,
    PRODUCT_INTEREST_RATE: pricing?.interestRate ?? null,
    PRODUCT_FLOATING_RATE: pricing?.floatingRate ?? null,
    PRODUCT_CAP_RATE: pricing?.capRate ?? null,
    PRODUCT_TENOR_FIXED: pricing?.tenorFixed ?? null,
    PRODUCT_APPROVER_RATE_MIN: pricing?.approverRateMin ?? null,
    PRODUCT_APPROVER_RATE_MAX: pricing?.approverRateMax ?? null,
  };
  return Object.fromEntries(
    Object.entries(terms).flatMap(([code, value]) => (value === null ? [] : [[code, String(value)]])),
  );
}
