import {
  type ProductCreateRequest,
  type ProductData,
  type ProductUpdateRequest,
  productCreateRequestSchema,
  productUpdateRequestSchema,
} from "@cikal/contracts";
import { formatMoney, formatPercent, todayIsoDate } from "../../lib/format";
import { optionalInteger, optionalMoney, optionalPercent, optionalText } from "./form-input";

const TEXT_FIELDS = [
  "productCode",
  "productName",
  "productCategory",
  "interestType",
  "contractType",
  "validFrom",
  "validTo",
] as const;
const MONEY_FIELDS = ["minPlafond", "maxPlafond", "limitAutoApproval"] as const;
const INTEGER_FIELDS = ["minTenor", "maxTenor", "minAge", "maxAge"] as const;
const PERCENT_FIELDS = ["dbrMax"] as const;
const PRESERVED_FIELDS = [
  "maxAgeAtMaturityMonth",
  "dsr",
  "multipleSalaryDbr",
  "adminFee",
  "provisionFee",
  "salesFee",
  "scoringApproval",
  "isPaylater",
] as const satisfies readonly (keyof ProductData)[];

/** Field yang tampil di form produk; nama sama dengan field body `POST /products` (api-specs 08 §8.3). */
export type ProductFormField =
  | (typeof TEXT_FIELDS)[number]
  | (typeof MONEY_FIELDS)[number]
  | (typeof INTEGER_FIELDS)[number]
  | (typeof PERCENT_FIELDS)[number];

export type ProductFormValues = Record<ProductFormField, string>;

/** Nilai awal form: kosong untuk "New Product" dengan Valid From hari ini, atau data aktif untuk edit. */
export function productFormDefaults(product?: ProductData): ProductFormValues {
  return {
    productCode: product?.productCode ?? "",
    productName: product?.productName ?? "",
    productCategory: product?.productCategory ?? "",
    interestType: product?.interestType ?? "",
    contractType: product?.contractType ?? "",
    minPlafond: product ? formatMoney(product.minPlafond) : "",
    maxPlafond: product ? formatMoney(product.maxPlafond) : "",
    limitAutoApproval: product ? formatMoney(product.limitAutoApproval) : "",
    minTenor: product ? String(product.minTenor) : "",
    maxTenor: product ? String(product.maxTenor) : "",
    minAge: product ? String(product.minAge) : "",
    maxAge: product ? String(product.maxAge) : "",
    dbrMax: product ? formatPercent(product.dbrMax) : "",
    validFrom: product?.validFrom ?? todayIsoDate(),
    validTo: product?.validTo ?? "",
  };
}

function formFields(values: ProductFormValues): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const name of TEXT_FIELDS) fields[name] = optionalText(values[name]);
  for (const name of MONEY_FIELDS) fields[name] = optionalMoney(values[name]);
  for (const name of PERCENT_FIELDS) fields[name] = optionalPercent(values[name]);
  for (const name of INTEGER_FIELDS) fields[name] = optionalInteger(values[name]);
  return fields;
}

/**
 * Field produk yang tidak ada di form ini ikut dikirim dari data aktif. `PUT /products/{id}` mengganti seluruh data,
 * dan field yang tidak dikirim kembali ke default, contoh Admin Fee menjadi 0 (api-specs 08 §8.3, §8.4).
 */
function preservedFields(product: ProductData): Record<string, unknown> {
  return Object.fromEntries(
    PRESERVED_FIELDS.flatMap((name) => (product[name] === null ? [] : [[name, product[name]]])),
  );
}

/** Body `POST /products`, atau `undefined` bila field wajib kosong atau formatnya salah. */
export function productCreateRequest(values: ProductFormValues): ProductCreateRequest | undefined {
  const parsed = productCreateRequestSchema.safeParse(formFields(values));
  return parsed.success ? parsed.data : undefined;
}

/** Body `PUT /products/{id}`: isi form di atas data aktif, atau `undefined` bila form tidak sah. */
export function productUpdateRequest(
  values: ProductFormValues,
  isActive: boolean,
  product: ProductData,
): ProductUpdateRequest | undefined {
  const parsed = productUpdateRequestSchema.safeParse({ ...preservedFields(product), ...formFields(values), isActive });
  return parsed.success ? parsed.data : undefined;
}
