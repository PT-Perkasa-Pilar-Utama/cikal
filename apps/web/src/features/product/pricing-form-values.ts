import {
  type InterestType,
  type ProductPricingResponse,
  type ProductPricingUpdateRequest,
  productPricingUpdateRequestSchema,
} from "@cikal/contracts";
import { formatMoney, formatPercent } from "../../lib/format";
import { optionalInteger, optionalMoney, optionalPercent, optionalText } from "./form-input";

type Pricing = ProductPricingResponse["data"];

/** Satu baris periode suku bunga di tab "Pricing"; `key` hanya untuk React. */
export interface PricingRowValues {
  key: number;
  interestRate: string;
  floatingRate: string;
  capRate: string;
  tenorFixed: string;
  approverRateMin: string;
  approverRateMax: string;
  validFrom: string;
  validTo: string;
}

export type PricingRowField = Exclude<keyof PricingRowValues, "key">;

export interface PricingFormValues {
  adminFee: string;
  provisionFee: string;
  salesFee: string;
  rows: PricingRowValues[];
}

/** Kolom tambahan per jenis bunga, mengikuti field kondisional api-specs 08 §8.6. */
export function conditionalRateFields(interestType: InterestType): PricingRowField[] {
  const fields: PricingRowField[] = [];
  if (interestType === "FLOATING" || interestType === "HYBRID") fields.push("floatingRate");
  if (interestType === "CAPPED") fields.push("capRate");
  if (interestType === "HYBRID") fields.push("tenorFixed");
  return fields;
}

const percentText = (value: string | null): string => (value === null ? "" : formatPercent(value));

export function emptyPricingRow(key: number): PricingRowValues {
  return {
    key,
    interestRate: "",
    floatingRate: "",
    capRate: "",
    tenorFixed: "",
    approverRateMin: "",
    approverRateMax: "",
    validFrom: "",
    validTo: "",
  };
}

/** Isi awal tab dari pricing aktif; produk tanpa periode mendapat satu baris kosong. */
export function pricingFormDefaults(pricing: Pricing): PricingFormValues {
  const rows = pricing.subProducts.map((period, index) => ({
    key: index,
    interestRate: formatPercent(period.interestRate),
    floatingRate: percentText(period.floatingRate),
    capRate: percentText(period.capRate),
    tenorFixed: period.tenorFixed === null ? "" : String(period.tenorFixed),
    approverRateMin: percentText(period.approverRateMin),
    approverRateMax: percentText(period.approverRateMax),
    validFrom: period.validFrom,
    validTo: period.validTo ?? "",
  }));
  return {
    adminFee: formatMoney(pricing.adminFee),
    provisionFee: formatPercent(pricing.provisionFee),
    salesFee: pricing.salesFee === null ? "" : formatMoney(pricing.salesFee),
    rows: rows.length > 0 ? rows : [emptyPricingRow(0)],
  };
}

/** Body `PUT /products/{id}/pricing`, atau `undefined` bila field wajib kosong atau formatnya salah. */
export function pricingUpdateRequest(
  values: PricingFormValues,
  interestType: InterestType,
): ProductPricingUpdateRequest | undefined {
  const conditional = new Set(conditionalRateFields(interestType));
  const parsed = productPricingUpdateRequestSchema.safeParse({
    adminFee: optionalMoney(values.adminFee),
    provisionFee: optionalPercent(values.provisionFee),
    salesFee: optionalMoney(values.salesFee),
    subProducts: values.rows.map((row) => ({
      interestRate: optionalPercent(row.interestRate),
      floatingRate: conditional.has("floatingRate") ? optionalPercent(row.floatingRate) : undefined,
      capRate: conditional.has("capRate") ? optionalPercent(row.capRate) : undefined,
      tenorFixed: conditional.has("tenorFixed") ? optionalInteger(row.tenorFixed) : undefined,
      approverRateMin: optionalPercent(row.approverRateMin),
      approverRateMax: optionalPercent(row.approverRateMax),
      validFrom: optionalText(row.validFrom),
      validTo: optionalText(row.validTo),
    })),
  });
  return parsed.success ? parsed.data : undefined;
}
