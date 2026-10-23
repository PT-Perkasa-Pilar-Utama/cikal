import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { moduleCodeSchema } from "../common/modules.js";
import { id, money, percent, timestamp } from "../common/scalars.js";
import { stepCodeSchema } from "../orchestrator/step.js";
import { interestTypeSchema, productCategorySchema } from "./products.schema.js";

/** Status versi rute (technical-specs 06 §6.13 data berversi). */
export const routeVersionStatusSchema = z.enum(["DRAFT", "WAITING_APPROVAL", "ACTIVE", "SUPERSEDED"]);
export type RouteVersionStatus = z.infer<typeof routeVersionStatusSchema>;

export const routeStepSettingSchema = z.strictObject({ stepCode: stepCodeSchema, isEnabled: z.boolean() });
export type RouteStepSetting = z.infer<typeof routeStepSettingSchema>;

/** Body `PUT /products/{id}/route` (api-specs 08 §8.9): satu baris per langkah yang tampil di editor. */
export const productRouteUpdateRequestSchema = z.strictObject({
  steps: z
    .array(routeStepSettingSchema)
    .min(1)
    .refine((steps) => new Set(steps.map((step) => step.stepCode)).size === steps.length, "Duplicate step"),
  effectiveFrom: timestamp.optional(),
});
export type ProductRouteUpdateRequest = z.infer<typeof productRouteUpdateRequestSchema>;

/**
 * Isi `currentData` dan `proposedData` ChangeRequest `ROUTE` (api-specs 07 §7.3). `currentData` adalah versi
 * ACTIVE, kosong untuk rute pertama produk.
 */
export const routeChangeDataSchema = z.object({
  productCode: z.string(),
  productName: z.string(),
  versionId: id,
  versionNumber: z.number().int().min(1),
  effectiveFrom: timestamp.nullable(),
  steps: z.array(routeStepSettingSchema),
});
export type RouteChangeData = z.infer<typeof routeChangeDataSchema>;

/** Query `GET /products/{id}/route` (api-specs 08 §8.10); tanpa `version` dipakai versi ACTIVE. */
export const productRouteQuerySchema = z.object({ version: z.coerce.number().int().min(1).optional() });
export type ProductRouteQuery = z.infer<typeof productRouteQuerySchema>;

/** `GET /products/{id}/route` (api-specs 08 §8.10): hanya langkah modul berlisensi, urut tech ref 6.3. */
export const productRouteResponseSchema = dataEnvelope(
  z.object({
    productId: id,
    versionNumber: z.number().int().min(1),
    status: routeVersionStatusSchema,
    effectiveFrom: timestamp.nullable(),
    pendingVersionNumber: z.number().int().min(1).nullable(),
    steps: z.array(
      z.object({
        stepCode: stepCodeSchema,
        moduleCode: moduleCodeSchema,
        order: z.number().int().min(1),
        isEnabled: z.boolean(),
        isMandatory: z.boolean(),
        isConditional: z.boolean(),
      }),
    ),
  }),
);
export type ProductRouteResponse = z.infer<typeof productRouteResponseSchema>;

/** Query `GET /products/available` (api-specs 08 §8.7). */
export const availableProductsQuerySchema = z.object({ productCategory: productCategorySchema });
export type AvailableProductsQuery = z.infer<typeof availableProductsQuerySchema>;

/**
 * `GET /products/available` (api-specs 08 §8.7): dropdown "Product" step Application. `currentInterestRate`
 * kosong bila tidak ada SubProduct yang berlaku hari ini.
 */
export const availableProductsResponseSchema = dataEnvelope(
  z.array(
    z.object({
      id,
      productCode: z.string(),
      productName: z.string(),
      interestType: interestTypeSchema,
      minPlafond: money,
      maxPlafond: money,
      minTenor: z.number().int(),
      maxTenor: z.number().int(),
      minAge: z.number().int(),
      maxAge: z.number().int(),
      currentInterestRate: percent.nullable(),
    }),
  ),
);
export type AvailableProductsResponse = z.infer<typeof availableProductsResponseSchema>;
