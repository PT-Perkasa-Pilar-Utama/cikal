import { z } from "zod";
import { dataEnvelope, pageEnvelope } from "../common/envelope.js";
import { businessDate, id, money, percent, timestamp } from "../common/scalars.js";

export const productCategorySchema = z.enum(["COLLATERAL", "NON_COLLATERAL", "PENSION", "SYARIAH"]);
export type ProductCategory = z.infer<typeof productCategorySchema>;
export const interestTypeSchema = z.enum(["FLAT", "EFFECTIVE", "FLOATING", "HYBRID", "CAPPED"]);
export type InterestType = z.infer<typeof interestTypeSchema>;

const tenor = z.number().int().min(1);
const age = z.number().int().min(0);

/**
 * Body `POST /products` (api-specs 08 §8.3). Format kode produk diperiksa server sebagai aturan bisnis
 * (`422 INVALID_PRODUCT_CODE`, AC-20.04), jadi skema hanya mewajibkan isinya.
 */
export const productCreateRequestSchema = z.strictObject({
  productCode: z.string().min(1),
  productName: z.string().min(1).max(100),
  productCategory: productCategorySchema,
  interestType: interestTypeSchema,
  contractType: z.string().min(1).optional(),
  minPlafond: money,
  maxPlafond: money,
  minTenor: tenor,
  maxTenor: tenor,
  minAge: age,
  maxAge: age,
  maxAgeAtMaturityMonth: z.number().int().optional(),
  dbrMax: percent,
  dsr: percent.optional(),
  multipleSalaryDbr: percent.optional(),
  adminFee: money.optional(),
  provisionFee: percent.optional(),
  salesFee: money.optional(),
  limitAutoApproval: money.optional(),
  scoringApproval: z.boolean().optional(),
  isPaylater: z.boolean().optional(),
  validFrom: businessDate,
  validTo: businessDate.optional(),
});
export type ProductCreateRequest = z.infer<typeof productCreateRequestSchema>;

/** Body `PUT /products/{id}` (api-specs 08 §8.4). */
export const productUpdateRequestSchema = productCreateRequestSchema.extend({ isActive: z.boolean() });
export type ProductUpdateRequest = z.infer<typeof productUpdateRequestSchema>;

/**
 * Data produk lengkap: isi `currentData` dan `proposedData` ChangeRequest `PRODUCT` (api-specs 07 §7.3) dan
 * dasar detail produk. Field opsional yang kosong bernilai `null`.
 */
export const productDataSchema = z.object({
  productCode: z.string(),
  productName: z.string(),
  productCategory: productCategorySchema,
  interestType: interestTypeSchema,
  contractType: z.string().nullable(),
  minPlafond: money,
  maxPlafond: money,
  minTenor: tenor,
  maxTenor: tenor,
  minAge: age,
  maxAge: age,
  maxAgeAtMaturityMonth: z.number().int().nullable(),
  dbrMax: percent,
  dsr: percent.nullable(),
  multipleSalaryDbr: percent.nullable(),
  adminFee: money,
  provisionFee: percent,
  salesFee: money.nullable(),
  limitAutoApproval: money,
  scoringApproval: z.boolean().nullable(),
  isPaylater: z.boolean().nullable(),
  validFrom: businessDate,
  validTo: businessDate.nullable(),
  isActive: z.boolean(),
});
export type ProductData = z.infer<typeof productDataSchema>;

/** Query `GET /products` (api-specs 08 §8.1). */
export const productListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  productCategory: productCategorySchema.optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(["productCode,asc", "productCode,desc", "productName,asc", "productName,desc"])
    .default("productCode,asc"),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productListItemSchema = z.object({
  id,
  productCode: z.string(),
  productName: z.string(),
  productCategory: productCategorySchema,
  interestType: interestTypeSchema,
  minPlafond: money,
  maxPlafond: money,
  minTenor: z.number().int(),
  maxTenor: z.number().int(),
  isActive: z.boolean(),
  hasActiveRoute: z.boolean(),
  hasPendingChange: z.boolean(),
});

/** `GET /products` (api-specs 08 §8.1). */
export const productListResponseSchema = pageEnvelope(productListItemSchema);
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

/** `GET /products/{id}` (api-specs 08 §8.2). */
export const productDetailResponseSchema = dataEnvelope(
  productDataSchema.extend({
    id,
    hasActiveRoute: z.boolean(),
    hasPendingChange: z.boolean(),
    updatedAt: timestamp,
  }),
);
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;

const subProductFields = {
  interestRate: percent,
  floatingRate: percent.nullable(),
  capRate: percent.nullable(),
  tenorFixed: z.number().int().nullable(),
  approverRateMin: percent.nullable(),
  approverRateMax: percent.nullable(),
  validFrom: businessDate,
  validTo: businessDate.nullable(),
};

/** Pricing produk: isi `currentData` dan `proposedData` ChangeRequest `PRODUCT_PRICING` (api-specs 07 §7.3). */
export const productPricingDataSchema = z.object({
  productCode: z.string(),
  productName: z.string(),
  adminFee: money,
  provisionFee: percent,
  salesFee: money.nullable(),
  subProducts: z.array(z.object(subProductFields)),
});
export type ProductPricingData = z.infer<typeof productPricingDataSchema>;

/** `GET /products/{id}/pricing` (api-specs 08 §8.5). */
export const productPricingResponseSchema = dataEnvelope(
  z.object({
    productId: id,
    interestType: interestTypeSchema,
    adminFee: money,
    provisionFee: percent,
    salesFee: money.nullable(),
    subProducts: z.array(z.object({ id, ...subProductFields })),
    hasPendingChange: z.boolean(),
  }),
);
export type ProductPricingResponse = z.infer<typeof productPricingResponseSchema>;

/** Body `PUT /products/{id}/pricing` (api-specs 08 §8.6). */
export const productPricingUpdateRequestSchema = z.strictObject({
  adminFee: money,
  provisionFee: percent,
  salesFee: money.optional(),
  subProducts: z
    .array(
      z.strictObject({
        interestRate: percent,
        floatingRate: percent.optional(),
        capRate: percent.optional(),
        tenorFixed: z.number().int().min(1).optional(),
        approverRateMin: percent.optional(),
        approverRateMax: percent.optional(),
        validFrom: businessDate,
        validTo: businessDate.optional(),
      }),
    )
    .min(1),
});
export type ProductPricingUpdateRequest = z.infer<typeof productPricingUpdateRequestSchema>;
