import { z } from "zod";
import { dataEnvelope, pageEnvelope } from "../common/envelope.js";
import { businessDate, id, money, percent, timestamp } from "../common/scalars.js";

export const productCategorySchema = z.enum(["COLLATERAL", "NON_COLLATERAL", "PENSION", "SYARIAH"]);
export const interestTypeSchema = z.enum(["FLAT", "EFFECTIVE", "FLOATING", "HYBRID", "CAPPED"]);

/** Body `POST /products` (api-specs 08 §8.3). */
export const productCreateRequestSchema = z.strictObject({
  productCode: z.string().regex(/^[A-Za-z0-9]{1,5}$/, "Product code must be 1 to 5 letters or digits"),
  productName: z.string().min(1).max(100),
  productCategory: productCategorySchema,
  interestType: interestTypeSchema,
  contractType: z.string().optional(),
  minPlafond: money,
  maxPlafond: money,
  minTenor: z.number().int().min(1),
  maxTenor: z.number().int().min(1),
  minAge: z.number().int().min(0),
  maxAge: z.number().int().min(0),
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
  productCreateRequestSchema.extend({
    id,
    isActive: z.boolean(),
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
        tenorFixed: z.number().int().optional(),
        approverRateMin: percent.optional(),
        approverRateMax: percent.optional(),
        validFrom: businessDate,
        validTo: businessDate.optional(),
      }),
    )
    .min(1),
});
export type ProductPricingUpdateRequest = z.infer<typeof productPricingUpdateRequestSchema>;
